/**
 * Migration: 003_update_models_with_tenantId.js
 * 
 * Purpose: Update all tenant-scoped model files to include tenantId field
 * 
 * This migration:
 * 1. Adds tenantId field to all tenant-scoped models
 * 2. Makes tenantId required
 * 3. Adds compound indexes for performance
 * 4. Updates model validation
 * 
 * Requirements: 6.1
 * 
 * NOTE: This is a CODE migration, not a DATA migration.
 * It modifies the model files themselves to add tenantId field definitions.
 * Run migrations 001 and 002 first to add tenantId to existing data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '../../models');

/**
 * Model configurations with their specific index requirements
 * Each entry specifies which compound indexes should be added
 */
const MODEL_CONFIGS = {
    'user.model.js': {
        indexes: [
            '{ tenantId: 1, email: 1 }, { unique: true }',
            '{ tenantId: 1, username: 1 }, { unique: true }',
            '{ tenantId: 1, employeeId: 1 }, { unique: true, sparse: true }',
            '{ tenantId: 1, role: 1 }',
            '{ tenantId: 1, department: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'department.model.js': {
        indexes: [
            '{ tenantId: 1, name: 1 }, { unique: true }',
            '{ tenantId: 1, code: 1 }, { unique: true, sparse: true }',
            '{ tenantId: 1, parentDepartment: 1 }',
            '{ tenantId: 1, manager: 1 }'
        ]
    },
    'position.model.js': {
        indexes: [
            '{ tenantId: 1, title: 1 }',
            '{ tenantId: 1, department: 1 }'
        ]
    },
    'attendance.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, date: 1 }, { unique: true }',
            '{ tenantId: 1, department: 1, date: 1 }',
            '{ tenantId: 1, status: 1 }',
            '{ tenantId: 1, date: 1 }'
        ]
    },
    'attendanceDevice.model.js': {
        indexes: [
            '{ tenantId: 1, deviceId: 1 }, { unique: true }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'request.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, type: 1 }',
            '{ tenantId: 1, status: 1 }',
            '{ tenantId: 1, requestedAt: 1 }'
        ]
    },
    'holiday.model.js': {
        indexes: [
            '{ tenantId: 1, date: 1 }',
            '{ tenantId: 1, year: 1 }'
        ]
    },
    'mission.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, startDate: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'vacation.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, startDate: 1 }',
            '{ tenantId: 1, status: 1 }',
            '{ tenantId: 1, vacationType: 1 }'
        ]
    },
    'mixedVacation.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, startDate: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'vacationBalance.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1 }, { unique: true }',
            '{ tenantId: 1, year: 1 }'
        ]
    },
    'overtime.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, date: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'forgetCheck.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, date: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'document.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1 }',
            '{ tenantId: 1, documentType: 1 }',
            '{ tenantId: 1, createdAt: 1 }'
        ]
    },
    'documentTemplate.model.js': {
        indexes: [
            '{ tenantId: 1, name: 1 }, { unique: true }',
            '{ tenantId: 1, category: 1 }'
        ]
    },
    'event.model.js': {
        indexes: [
            '{ tenantId: 1, date: 1 }',
            '{ tenantId: 1, eventType: 1 }'
        ]
    },
    'notification.model.js': {
        indexes: [
            '{ tenantId: 1, recipient: 1, read: 1 }',
            '{ tenantId: 1, createdAt: 1 }'
        ]
    },
    'payroll.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, month: 1, year: 1 }, { unique: true }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'permission.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'permissionAudit.model.js': {
        indexes: [
            '{ tenantId: 1, user: 1 }',
            '{ tenantId: 1, timestamp: 1 }'
        ]
    },
    'report.model.js': {
        indexes: [
            '{ tenantId: 1, reportType: 1 }',
            '{ tenantId: 1, createdAt: 1 }'
        ]
    },
    'reportConfig.model.js': {
        indexes: [
            '{ tenantId: 1, name: 1 }, { unique: true }'
        ]
    },
    'reportExecution.model.js': {
        indexes: [
            '{ tenantId: 1, reportConfig: 1 }',
            '{ tenantId: 1, executedAt: 1 }'
        ]
    },
    'reportExport.model.js': {
        indexes: [
            '{ tenantId: 1, report: 1 }',
            '{ tenantId: 1, createdAt: 1 }'
        ]
    },
    'resignedEmployee.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1 }',
            '{ tenantId: 1, resignationDate: 1 }'
        ]
    },
    'role.model.js': {
        indexes: [
            '{ tenantId: 1, name: 1 }, { unique: true }'
        ]
    },
    'survey.model.js': {
        indexes: [
            '{ tenantId: 1, status: 1 }',
            '{ tenantId: 1, createdAt: 1 }'
        ]
    },
    'surveyNotification.model.js': {
        indexes: [
            '{ tenantId: 1, survey: 1, recipient: 1 }'
        ]
    },
    'sickLeave.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1, startDate: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'backup.model.js': {
        indexes: [
            '{ tenantId: 1, createdAt: 1 }',
            '{ tenantId: 1, status: 1 }'
        ]
    },
    'backupExecution.model.js': {
        indexes: [
            '{ tenantId: 1, backup: 1 }',
            '{ tenantId: 1, executedAt: 1 }'
        ]
    },
    'dashboardConfig.model.js': {
        indexes: [
            '{ tenantId: 1, user: 1 }, { unique: true }'
        ]
    },
    'themeConfig.model.js': {
        indexes: [
            '{ tenantId: 1 }, { unique: true }'
        ]
    },
    'securitySettings.model.js': {
        indexes: [
            '{ tenantId: 1 }, { unique: true }'
        ]
    },
    'securityAudit.model.js': {
        indexes: [
            '{ tenantId: 1, timestamp: 1 }',
            '{ tenantId: 1, eventType: 1 }'
        ]
    },
    'announcement.model.js': {
        indexes: [
            '{ tenantId: 1, createdAt: 1 }',
            '{ tenantId: 1, priority: 1 }'
        ]
    },
    'hardcopy.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1 }',
            '{ tenantId: 1, createdAt: 1 }'
        ]
    },
    'idCard.model.js': {
        indexes: [
            '{ tenantId: 1, employee: 1 }',
            '{ tenantId: 1, batch: 1 }'
        ]
    },
    'idCardBatch.model.js': {
        indexes: [
            '{ tenantId: 1, createdAt: 1 }'
        ]
    },
    'requestControl.model.js': {
        indexes: [
            '{ tenantId: 1, requestType: 1 }'
        ]
    },
    'organization.model.js': {
        indexes: [
            '{ tenantId: 1, name: 1 }, { unique: true }'
        ]
    }
};

/**
 * TenantId field definition to be added to models
 */
const TENANT_ID_FIELD = `    tenantId: {
        type: String,
        required: [true, 'Tenant ID is required'],
        index: true,
        trim: true
    },`;

/**
 * Check if model file already has tenantId field
 */
function hasTenantId(content) {
    return content.includes('tenantId:') || content.includes('tenantId :');
}

/**
 * Add tenantId field to schema definition
 */
function addTenantIdField(content) {
    // Find the schema definition
    const schemaRegex = /(const\s+\w+Schema\s*=\s*new\s+mongoose\.Schema\(\s*\{)/;
    const match = content.match(schemaRegex);
    
    if (!match) {
        throw new Error('Could not find schema definition');
    }
    
    // Insert tenantId field right after the opening brace
    const insertPosition = match.index + match[0].length;
    const before = content.substring(0, insertPosition);
    const after = content.substring(insertPosition);
    
    return before + '\n' + TENANT_ID_FIELD + after;
}

/**
 * Add compound indexes to model
 */
function addCompoundIndexes(content, indexes) {
    if (!indexes || indexes.length === 0) {
        return content;
    }
    
    // Find the end of the file (before export)
    const exportRegex = /export\s+default\s+mongoose\.model/;
    const match = content.match(exportRegex);
    
    if (!match) {
        throw new Error('Could not find export statement');
    }
    
    // Build index statements
    const indexStatements = indexes.map(index => {
        return `${content.includes('import') ? '' : '// '}// Compound index for tenant isolation\n${content.includes('import') ? '' : ''}${content.match(/const\s+(\w+)Schema/)[1]}.index(${index});`;
    }).join('\n');
    
    // Insert before export
    const insertPosition = match.index;
    const before = content.substring(0, insertPosition);
    const after = content.substring(insertPosition);
    
    return before + '\n' + indexStatements + '\n\n' + after;
}

/**
 * Process a single model file
 */
function processModelFile(filename, config) {
    const filePath = path.join(MODELS_DIR, filename);
    
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log(`  ⊘ File not found: ${filename}`);
            return { success: false, skipped: true };
        }
        
        // Read file content
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if already has tenantId
        if (hasTenantId(content)) {
            console.log(`  ✓ ${filename} already has tenantId`);
            return { success: true, skipped: true };
        }
        
        // Add tenantId field
        content = addTenantIdField(content);
        
        // Add compound indexes
        if (config.indexes) {
            content = addCompoundIndexes(content, config.indexes);
        }
        
        // Write back to file
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log(`  ✓ Updated ${filename}`);
        return { success: true, skipped: false };
        
    } catch (error) {
        console.error(`  ✗ Error processing ${filename}:`, error.message);
        return { success: false, skipped: false, error: error.message };
    }
}

/**
 * Main migration function
 */
async function migrate() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🔧 Starting Migration: 003_update_models_with_tenantId.js');
        console.log('='.repeat(70));
        console.log(`📍 Models Directory: ${MODELS_DIR}`);
        console.log(`📍 Total Models to Process: ${Object.keys(MODEL_CONFIGS).length}`);
        console.log('='.repeat(70) + '\n');
        
        let updated = 0;
        let skipped = 0;
        let failed = 0;
        
        // Process each model
        for (const [filename, config] of Object.entries(MODEL_CONFIGS)) {
            console.log(`\n📦 Processing: ${filename}`);
            const result = processModelFile(filename, config);
            
            if (result.success) {
                if (result.skipped) {
                    skipped++;
                } else {
                    updated++;
                }
            } else {
                failed++;
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('✓ Migration Complete!');
        console.log('='.repeat(70));
        console.log(`📊 Models updated: ${updated}`);
        console.log(`📊 Models skipped: ${skipped}`);
        console.log(`📊 Models failed: ${failed}`);
        console.log('\n⚠ IMPORTANT NOTES:');
        console.log('   1. Review the updated model files for correctness');
        console.log('   2. Run tests to ensure models work as expected');
        console.log('   3. Restart the application to load updated models');
        console.log('   4. Run migration 001 to add tenantId to existing data');
        console.log('='.repeat(70) + '\n');
        
        process.exit(failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('✗ Migration Failed!');
        console.error('='.repeat(70));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(70) + '\n');
        
        process.exit(1);
    }
}

/**
 * Rollback function (removes tenantId from models)
 */
async function rollback() {
    console.log('\n⚠ WARNING: Rollback for code changes is not automated.');
    console.log('Please use version control (git) to revert model file changes.');
    console.log('Run: git checkout server/models/*.js\n');
    process.exit(0);
}

// Execute migration or rollback based on command line argument
const command = process.argv[2];

if (command === 'rollback') {
    rollback();
} else {
    migrate();
}
