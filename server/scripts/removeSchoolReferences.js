/**
 * Script to remove organization model references from test files
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDir = path.join(__dirname, '../testing');

// Function to recursively find all .js files
function findJSFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...findJSFiles(fullPath));
        } else if (item.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

// Function to remove organization references from a file
function removeorganizationReferences(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Remove organization import
        if (content.includes("import organization from '../../platform/models/organization.model.js';")) {
            content = content.replace(
                "import organization from '../../platform/models/organization.model.js';",
                "// organization model removed - not needed for general HR system"
            );
            modified = true;
        }
        
        // Remove createTestorganization from imports
        if (content.includes('createTestorganization')) {
            content = content.replace(/,\s*createTestorganization/g, '');
            content = content.replace(/createTestorganization,\s*/g, '');
            content = content.replace(/{\s*createTestorganization\s*}/g, '{}');
            modified = true;
        }
        
        // Remove organization variable declarations and usage
        content = content.replace(/let organization;?\s*/g, '// organization variable removed\n');
        content = content.replace(/const organization = await createTestorganization\(\);?\s*/g, '// organization creation removed\n');
        content = content.replace(/organization = await createTestorganization\(\);?\s*/g, '// organization creation removed\n');
        
        // Remove organization references in test setup
        content = content.replace(/,\s*organization/g, '');
        content = content.replace(/organization,\s*/g, '');
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated: ${path.relative(testDir, filePath)}`);
        }
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
    }
}

// Main execution
console.log('🔧 Removing organization model references from test files...\n');

const jsFiles = findJSFiles(testDir);
let updatedCount = 0;

for (const file of jsFiles) {
    const originalContent = fs.readFileSync(file, 'utf8');
    removeorganizationReferences(file);
    const newContent = fs.readFileSync(file, 'utf8');
    
    if (originalContent !== newContent) {
        updatedCount++;
    }
}

console.log(`\n🎉 Completed! Updated ${updatedCount} files.`);