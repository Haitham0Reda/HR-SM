const fs = require('fs');
const path = require('path');

// Map of [oldPath, newPath, oldBasename, newBasename]
const renames = [
    ['server/modules/email-service/controllers/emailController.js', 
     'server/modules/email-service/controllers/email.controller.js',
     'emailController.js', 'email.controller.js'],
    
    ['server/modules/life-insurance/controllers/claimController.js', 
     'server/modules/life-insurance/controllers/claim.controller.js',
     'claimController.js', 'claim.controller.js'],
    
    ['server/modules/life-insurance/controllers/configController.js', 
     'server/modules/life-insurance/controllers/config.controller.js',
     'configController.js', 'config.controller.js'],
    
    ['server/modules/life-insurance/controllers/employeeController.js', 
     'server/modules/life-insurance/controllers/employee.controller.js',
     'employeeController.js', 'employee.controller.js'],
    
    ['server/modules/life-insurance/controllers/familyMemberController.js', 
     'server/modules/life-insurance/controllers/familyMember.controller.js',
     'familyMemberController.js', 'familyMember.controller.js'],
    
    ['server/modules/life-insurance/controllers/insuranceController.js', 
     'server/modules/life-insurance/controllers/insurance.controller.js',
     'insuranceController.js', 'insurance.controller.js'],
    
    ['server/modules/life-insurance/controllers/insuranceProviderController.js', 
     'server/modules/life-insurance/controllers/insuranceProvider.controller.js',
     'insuranceProviderController.js', 'insuranceProvider.controller.js'],
    
    ['server/modules/life-insurance/controllers/reportController.js', 
     'server/modules/life-insurance/controllers/report.controller.js',
     'reportController.js', 'report.controller.js'],
    
    ['server/platform/auth/controllers/platformAuthController.js', 
     'server/platform/auth/controllers/platformAuth.controller.js',
     'platformAuthController.js', 'platformAuth.controller.js'],
    
    ['server/platform/companies/controllers/companyController.js', 
     'server/platform/companies/controllers/company.controller.js',
     'companyController.js', 'company.controller.js'],
    
    ['server/platform/controllers/ModuleController.js', 
     'server/platform/controllers/Module.controller.js',
     'ModuleController.js', 'Module.controller.js'],
    
    ['server/platform/modules/controllers/moduleController.js', 
     'server/platform/modules/controllers/module.controller.js',
     'moduleController.js', 'module.controller.js'],
    
    ['server/platform/system/controllers/healthController.js', 
     'server/platform/system/controllers/health.controller.js',
     'healthController.js', 'health.controller.js'],
    
    ['server/platform/system/controllers/metricsController.js', 
     'server/platform/system/controllers/metrics.controller.js',
     'metricsController.js', 'metrics.controller.js'],
    
    ['server/platform/tenants/controllers/tenantController.js', 
     'server/platform/tenants/controllers/tenant.controller.js',
     'tenantController.js', 'tenant.controller.js'],
];

// Step 1: Rename files
let renamed = 0;
for (const [oldPath, newPath, oldName, newName] of renames) {
    if (fs.existsSync(oldPath)) {
        // Check if newPath already exists (duplicate)
        if (fs.existsSync(newPath)) {
            console.log('SKIP (exists): ' + oldPath);
            continue;
        }
        fs.renameSync(oldPath, newPath);
        renamed++;
        console.log('Renamed: ' + oldPath.replace(/\\/g, '/').replace('server/', '') + ' -> ' + newName);
    } else {
        console.log('NOT FOUND: ' + oldPath.replace(/\\/g, '/').replace('server/', ''));
    }
}
console.log('\nRenamed ' + renamed + ' files\n');

// Step 2: Update import references in all .js files
// Find all .js files in server/
const allFiles = [];
function walk(dir) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const lower = fullPath.toLowerCase();
                if (lower.includes('backups') || lower.includes('testing') || lower.includes('node_modules') || lower.includes('__tests__')) continue;
                walk(fullPath);
            } else if (entry.name.endsWith('.js')) {
                allFiles.push(fullPath);
            }
        }
    } catch (e) {}
}
walk('server');

let updated = 0;
for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Replace each old filename reference with new filename
    for (const [oldPath, newPath, oldName, newName] of renames) {
        // Match the old filename in import paths
        content = content.replace(
            new RegExp(oldName.replace(/\./g, '\\.').replace(/\//g, '\\/'), 'g'),
            newName
        );
    }
    
    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        updated++;
        console.log('Updated imports: ' + file.replace(/\\/g, '/').replace('server/', ''));
    }
}
console.log('\nUpdated imports in ' + updated + ' files');

// Step 3: Verify syntax of all renamed and updated files
console.log('\n=== Syntax verification ===');
let errors = 0;
const { execSync } = require('child_process');

// Check renamed controller files
for (const [oldPath, newPath, oldName, newName] of renames) {
    if (fs.existsSync(newPath)) {
        try {
            execSync('node --check "' + newPath + '"', { stdio: 'pipe' });
        } catch (e) {
            console.log('SYNTAX ERROR in: ' + newPath);
            errors++;
        }
    }
}

// Check files with updated imports
for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    for (const [oldPath, newPath, oldName, newName] of renames) {
        if (content.includes(newName) && !content.includes(oldName)) {
            modified = true;
            break;
        }
    }
    if (modified) {
        try {
            execSync('node --check "' + file + '"', { stdio: 'pipe' });
        } catch (e) {
            console.log('SYNTAX ERROR in: ' + file.replace(/\\/g, '/').replace('server/', ''));
            errors++;
        }
    }
}

if (errors === 0) {
    console.log('All renamed and updated files pass syntax check');
} else {
    console.log(errors + ' syntax errors found');
}
