#!/usr/bin/env node

/**
 * Script to check HR-Core module boundaries
 * Ensures HR-Core does not import from optional modules
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HR_CORE_PATH = path.join(__dirname, '..', 'server', 'modules', 'hr-core');
const OPTIONAL_MODULES = ['tasks', 'payroll', 'documents', 'reports', 'notifications', 'clinic', 'email-service'];

let violations = [];

/**
 * Recursively scan directory for JS files
 */
function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            scanDirectory(filePath);
        } else if (file.endsWith('.js')) {
            checkFile(filePath);
        }
    }
}

/**
 * Check a file for forbidden imports
 */
function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        // Check for import statements
        const importMatch = line.match(/import\s+.*\s+from\s+['"](.+)['"]/);
        if (importMatch) {
            const importPath = importMatch[1];
            
            // Check if importing from optional modules
            for (const module of OPTIONAL_MODULES) {
                if (importPath.includes(`modules/${module}`)) {
                    violations.push({
                        file: path.relative(process.cwd(), filePath),
                        line: index + 1,
                        import: importPath,
                        module: module
                    });
                }
            }
        }
        
        // Check for require statements
        const requireMatch = line.match(/require\s*\(\s*['"](.+)['"]\s*\)/);
        if (requireMatch) {
            const requirePath = requireMatch[1];
            
            // Check if requiring from optional modules
            for (const module of OPTIONAL_MODULES) {
                if (requirePath.includes(`modules/${module}`)) {
                    violations.push({
                        file: path.relative(process.cwd(), filePath),
                        line: index + 1,
                        import: requirePath,
                        module: module
                    });
                }
            }
        }
    });
}

// Run the check
console.log('🔍 Checking HR-Core module boundaries...\n');

if (!fs.existsSync(HR_CORE_PATH)) {
    console.error('❌ HR-Core directory not found:', HR_CORE_PATH);
    process.exit(1);
}

scanDirectory(HR_CORE_PATH);

if (violations.length > 0) {
    console.error('❌ HR-Core boundary violations detected!\n');
    console.error('🚨 CRITICAL: HR-Core CANNOT depend on ANY optional module!\n');
    console.error('Violations found:\n');
    
    violations.forEach(v => {
        console.error(`  ${v.file}:${v.line}`);
        console.error(`    Importing from optional module: ${v.module}`);
        console.error(`    Import path: ${v.import}\n`);
    });
    
    console.error('\nHR-Core must work standalone. This is a sacred boundary.');
    console.error('Allowed imports: core/, utils/, middleware/, shared/');
    console.error('\nPlease remove these imports from HR-Core.\n');
    
    process.exit(1);
}

console.log('✅ HR-Core boundaries are intact');
console.log('✅ No imports from optional modules found\n');

process.exit(0);
