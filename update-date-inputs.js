#!/usr/bin/env node

/**
 * Script to update all TextField date inputs to use dd/mm/yy format
 * This will replace type="date" TextFields with the new DateInput component
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Files to process
const INCLUDE_PATTERNS = [
    'client/hr-app/src/**/*.jsx',
    'client/hr-app/src/**/*.js'
];

// Files to exclude
const EXCLUDE_PATTERNS = [
    '**/node_modules/**',
    '**/build/**',
    '**/dist/**',
    '**/coverage/**',
    '**/*.test.js',
    '**/*.test.jsx',
    '**/*.spec.js',
    '**/*.spec.jsx'
];

function shouldProcessFile(filePath) {
    // Check if file should be excluded
    for (const pattern of EXCLUDE_PATTERNS) {
        if (filePath.includes(pattern.replace('**/', '').replace('*', ''))) {
            return false;
        }
    }
    return true;
}

function updateDateInputs(content, filePath) {
    let modified = false;
    let newContent = content;
    
    // Check if file already imports DateInput
    const hasDateInputImport = /import.*DateInput.*from/.test(newContent);
    
    // Pattern to match TextField with type="date"
    const textFieldDatePattern = /<TextField\s+([^>]*?)type=["']date["']([^>]*?)>/g;
    
    let matches = [...newContent.matchAll(textFieldDatePattern)];
    
    if (matches.length > 0) {
        console.log(`Found ${matches.length} date TextField(s) in ${filePath}`);
        
        // Add DateInput import if not present
        if (!hasDateInputImport) {
            // Determine correct import path based on file location
            let importPath;
            if (filePath.includes('/pages/')) {
                importPath = '../../components/common/DateInput';
            } else if (filePath.includes('/components/')) {
                importPath = '../common/DateInput';
            } else {
                importPath = './components/common/DateInput'; // fallback
            }
            
            // Find existing imports
            const importPattern = /import.*from\s+['"][^'"]*\/components\/common\/[^'"]*['"];?\s*\n/;
            const lastImportMatch = newContent.match(importPattern);
            
            if (lastImportMatch) {
                // Add after existing common component imports
                const importIndex = newContent.lastIndexOf(lastImportMatch[0]) + lastImportMatch[0].length;
                newContent = newContent.slice(0, importIndex) + 
                           `import DateInput from '${importPath}';\n` +
                           newContent.slice(importIndex);
            } else {
                // Add after other imports
                const importEndPattern = /import.*from.*['"];?\s*\n(?=\s*\n)/;
                const importEndMatch = newContent.match(importEndPattern);
                
                if (importEndMatch) {
                    const importIndex = newContent.indexOf(importEndMatch[0]) + importEndMatch[0].length;
                    newContent = newContent.slice(0, importIndex) + 
                               `import DateInput from '${importPath}';\n` +
                               newContent.slice(importIndex);
                }
            }
            modified = true;
        }
        
        // Replace TextField with DateInput
        newContent = newContent.replace(textFieldDatePattern, (match, beforeType, afterType) => {
            // Remove type="date" and replace TextField with DateInput
            const cleanedBefore = beforeType.replace(/\s*$/, ''); // Remove trailing whitespace
            const cleanedAfter = afterType.replace(/^\s*/, ''); // Remove leading whitespace
            
            return `<DateInput ${cleanedBefore}${cleanedAfter ? ' ' + cleanedAfter : ''}>`;
        });
        
        modified = true;
    }
    
    return { content: newContent, modified };
}

async function processFiles() {
    console.log('🔄 Starting date input update...');
    
    let totalFiles = 0;
    let modifiedFiles = 0;
    
    for (const pattern of INCLUDE_PATTERNS) {
        const files = await glob(pattern, { ignore: EXCLUDE_PATTERNS });
        
        for (const file of files) {
            if (!shouldProcessFile(file)) {
                continue;
            }
            
            try {
                const content = fs.readFileSync(file, 'utf8');
                
                // Only process files that contain TextField with type="date"
                if (content.includes('type="date"') || content.includes("type='date'")) {
                    const result = updateDateInputs(content, file);
                    
                    totalFiles++;
                    
                    if (result.modified) {
                        fs.writeFileSync(file, result.content, 'utf8');
                        console.log(`✅ Updated: ${file}`);
                        modifiedFiles++;
                    }
                }
            } catch (error) {
                console.error(`❌ Error processing ${file}:`, error.message);
            }
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total files processed: ${totalFiles}`);
    console.log(`   Files modified: ${modifiedFiles}`);
    console.log(`   Files unchanged: ${totalFiles - modifiedFiles}`);
    
    if (modifiedFiles > 0) {
        console.log(`\n🎉 Successfully updated ${modifiedFiles} files to use dd/mm/yy date format!`);
        console.log(`\n📝 Next steps:`);
        console.log(`   1. Review the changes`);
        console.log(`   2. Test the date inputs`);
        console.log(`   3. Commit the changes`);
    }
}

// Run the migration
processFiles().catch(console.error);