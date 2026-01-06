#!/usr/bin/env node

/**
 * Migration Script: Convert Global Models to Tenant-Specific Models
 * 
 * This script helps identify and update any remaining references to the old global models
 * that have been converted to tenant-specific models.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

// Mapping of old global model imports to new tenant-specific imports
const MODEL_MIGRATIONS = {
  // Old global imports -> New module-based imports
  "import BackupLog from '../models/BackupLog.js'": "import { getModelForConnection } from '../config/sharedModels.js'",
  "import DataArchive from '../models/DataArchive.js'": "import { getModelForConnection } from '../config/sharedModels.js'",
  "import DataRetentionPolicy from '../models/DataRetentionPolicy.js'": "import { getModelForConnection } from '../config/sharedModels.js'",
  "import PerformanceMetrics from '../models/performanceMetrics.model.js'": "import { getModelForConnection } from '../config/sharedModels.js'",
  "import SecurityEvents from '../models/securityEvents.model.js'": "import { getModelForConnection } from '../config/sharedModels.js'",
  "import SystemAlerts from '../models/systemAlerts.model.js'": "import { getModelForConnection } from '../config/sharedModels.js'",
  "import CompanyLicense from '../models/CompanyLicense.js'": "import { getModelForConnection } from '../config/sharedModels.js'",
  
  // Relative path variations
  "from '../../models/BackupLog.js'": "from '../../config/sharedModels.js'",
  "from '../../models/DataArchive.js'": "from '../../config/sharedModels.js'",
  "from '../../models/DataRetentionPolicy.js'": "from '../../config/sharedModels.js'",
  "from '../../models/performanceMetrics.model.js'": "from '../../config/sharedModels.js'",
  "from '../../models/securityEvents.model.js'": "from '../../config/sharedModels.js'",
  "from '../../models/systemAlerts.model.js'": "from '../../config/sharedModels.js'",
  "from '../../models/CompanyLicense.js'": "from '../../config/sharedModels.js'",
  
  // Three levels up
  "from '../../../models/BackupLog.js'": "from '../../../config/sharedModels.js'",
  "from '../../../models/DataArchive.js'": "from '../../../config/sharedModels.js'",
  "from '../../../models/DataRetentionPolicy.js'": "from '../../../config/sharedModels.js'",
  "from '../../../models/performanceMetrics.model.js'": "from '../../../config/sharedModels.js'",
  "from '../../../models/securityEvents.model.js'": "from '../../../config/sharedModels.js'",
  "from '../../../models/systemAlerts.model.js'": "from '../../../config/sharedModels.js'",
  "from '../../../models/CompanyLicense.js'": "from '../../../config/sharedModels.js'"
};

// Method call patterns that need tenant ID
const METHOD_PATTERNS = {
  'BackupLog.getStatistics(': 'BackupLog.getStatistics(tenantId, ',
  'BackupLog.findExpiredBackups()': 'BackupLog.findExpiredBackups(tenantId)',
  'BackupLog.getRecentBackups(': 'BackupLog.getRecentBackups(tenantId, ',
  'BackupLog.getBackupById(': 'BackupLog.getBackupById(tenantId, '
};

// Files to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'backups',
  'logs',
  'uploads',
  '.env',
  'package-lock.json',
  'README.md'
];

async function scanDirectory(dirPath, results = []) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, results);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
  }
  
  return results;
}

async function analyzeFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const issues = [];
    
    // Check for old model imports
    for (const [oldPattern, newPattern] of Object.entries(MODEL_MIGRATIONS)) {
      if (content.includes(oldPattern)) {
        issues.push({
          type: 'import',
          line: findLineNumber(content, oldPattern),
          old: oldPattern,
          new: newPattern,
          description: 'Update import to use tenant-specific model registry'
        });
      }
    }
    
    // Check for method calls that need tenant ID
    for (const [oldPattern, newPattern] of Object.entries(METHOD_PATTERNS)) {
      if (content.includes(oldPattern)) {
        issues.push({
          type: 'method',
          line: findLineNumber(content, oldPattern),
          old: oldPattern,
          new: newPattern,
          description: 'Add tenantId parameter to method call'
        });
      }
    }
    
    // Check for direct model usage without getModelForConnection
    const modelNames = ['BackupLog', 'DataArchive', 'DataRetentionPolicy', 'PerformanceMetrics', 'SecurityEvents', 'SystemAlerts', 'CompanyLicense'];
    for (const modelName of modelNames) {
      const directUsagePattern = new RegExp(`\\b${modelName}\\.(find|create|update|delete|aggregate)`, 'g');
      const matches = content.match(directUsagePattern);
      if (matches && !content.includes('getModelForConnection')) {
        issues.push({
          type: 'usage',
          line: findLineNumber(content, matches[0]),
          old: matches[0],
          new: `const ${modelName} = getModelForConnection(connection, '${modelName}'); ${matches[0]}`,
          description: 'Use getModelForConnection to get tenant-specific model instance'
        });
      }
    }
    
    return issues.length > 0 ? { filePath, issues } : null;
  } catch (error) {
    console.warn(`Warning: Could not analyze file ${filePath}: ${error.message}`);
    return null;
  }
}

function findLineNumber(content, searchText) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText)) {
      return i + 1;
    }
  }
  return 1;
}

async function generateMigrationReport() {
  console.log('🔍 Scanning for global model references...\n');
  
  const serverPath = path.join(projectRoot, 'server');
  const files = await scanDirectory(serverPath);
  
  console.log(`📁 Found ${files.length} JavaScript/TypeScript files to analyze\n`);
  
  const problemFiles = [];
  let totalIssues = 0;
  
  for (const filePath of files) {
    const analysis = await analyzeFile(filePath);
    if (analysis) {
      problemFiles.push(analysis);
      totalIssues += analysis.issues.length;
    }
  }
  
  if (problemFiles.length === 0) {
    console.log('✅ No global model references found! Migration is complete.\n');
    return;
  }
  
  console.log(`⚠️  Found ${totalIssues} issues in ${problemFiles.length} files:\n`);
  
  for (const { filePath, issues } of problemFiles) {
    const relativePath = path.relative(projectRoot, filePath);
    console.log(`📄 ${relativePath}`);
    
    for (const issue of issues) {
      console.log(`   Line ${issue.line}: ${issue.description}`);
      console.log(`   - Old: ${issue.old}`);
      console.log(`   + New: ${issue.new}`);
      console.log('');
    }
  }
  
  console.log('🔧 Migration Steps Required:\n');
  console.log('1. Update imports to use getModelForConnection from sharedModels.js');
  console.log('2. Add tenantId parameters to static method calls');
  console.log('3. Get model instances using getModelForConnection(connection, modelName)');
  console.log('4. Ensure all queries are scoped to the current tenant\n');
  
  console.log('📖 For detailed migration guide, see: server/models/README.md\n');
}

// Run the migration analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  generateMigrationReport().catch(console.error);
}

export { generateMigrationReport, MODEL_MIGRATIONS, METHOD_PATTERNS };