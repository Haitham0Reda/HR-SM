/**
 * Complete organization and location Removal Script
 * Removes ALL organization, location, business, company, company references from the entire project
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '../..');

// Patterns to search for and replace
const replacementPatterns = [
    // organization/location references
    { search: /\borganization\b/gi, replace: 'organization' },
    { search: /\blocation\b/gi, replace: 'location' },
    { search: /\buniversity\b/gi, replace: 'company' },
    { search: /\bcollege\b/gi, replace: 'company' },
    { search: /\bacademic\b/gi, replace: 'business' },
    { search: /\bfaculty\b/gi, replace: 'staff' },
    { search: /\bstudent\b/gi, replace: 'member' },
    
    // business positions
    { search: /\bprofessor\b/gi, replace: 'manager' },
    { search: /\blecturer\b/gi, replace: 'specialist' },
    { search: /\binstructor\b/gi, replace: 'coordinator' },
    { search: /\bteacher\b/gi, replace: 'trainer' },
    
    // business terms
    { search: /\bsemester\b/gi, replace: 'quarter' },
    { search: /\bcourse\b/gi, replace: 'program' },
    { search: /\bgrade\b/gi, replace: 'level' },
    { search: /\bmajor\b/gi, replace: 'specialization' },
    { search: /\bdegree\b/gi, replace: 'certification' },
    
    // Specific business references
    { search: /engineering\s+department/gi, replace: 'technical department' },
    { search: /computer\s+science/gi, replace: 'information technology' },
    { search: /business\s+year/gi, replace: 'fiscal year' },
    { search: /organization\s+year/gi, replace: 'business year' },
    
    // Email domains
    { search: /\.edu\./g, replace: '.com.' },
    { search: /@company.com/g, replace: '@company.com' },
    
    // File/folder names with organization references
    { search: /organization/gi, replace: 'organization' },
    { search: /location/gi, replace: 'location' }
];

// File extensions to process
const processableExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.yml', '.yaml'];

// Directories to exclude
const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

function shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    return processableExtensions.includes(ext);
}

function shouldProcessDirectory(dirName) {
    return !excludeDirs.includes(dirName) && !dirName.startsWith('.');
}

function findAllFiles(dir) {
    const files = [];
    
    try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                if (shouldProcessDirectory(item)) {
                    files.push(...findAllFiles(fullPath));
                }
            } else if (shouldProcessFile(fullPath)) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
    }
    
    return files;
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        const originalContent = content;
        
        // Apply all replacement patterns
        for (const pattern of replacementPatterns) {
            const newContent = content.replace(pattern.search, pattern.replace);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        }
        
        // Specific replacements for common patterns
        const specificReplacements = [
            // Import statements
            { from: "import organization from", to: "// organization import removed" },
            { from: "import.*organization.model", to: "// organization model import removed" },
            
            // Function calls
            { from: "createTestorganization", to: "createTestOrganization" },
            { from: "getOrCreateForlocation", to: "getOrCreateForLocation" },
            
            // Variable names
            { from: "defaultorganization", to: "defaultOrganization" },
            { from: "organization\\.", to: "organization." },
            { from: "location\\.", to: "location." },
            
            // Comments and descriptions
            { from: "organization/location", to: "Organization/Location" },
            { from: "organization or location", to: "organization or location" },
            
            // Database fields
            { from: '"location":', to: '"locationId":' },
            { from: "'location':", to: "'locationId':" },
            
            // Route paths
            { from: "/location/", to: "/location/" },
            { from: "/organization/", to: "/organization/" }
        ];
        
        for (const replacement of specificReplacements) {
            const regex = new RegExp(replacement.from, 'gi');
            const newContent = content.replace(regex, replacement.to);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            const relativePath = path.relative(projectRoot, filePath);
            console.log(`✅ Updated: ${relativePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error processing ${filePath}: ${error.message}`);
        return false;
    }
}

// Main execution
console.log('🔧 Starting comprehensive organization/location removal...\n');

const allFiles = findAllFiles(projectRoot);
let processedCount = 0;
let modifiedCount = 0;

console.log(`Found ${allFiles.length} files to process...\n`);

for (const file of allFiles) {
    processedCount++;
    if (processFile(file)) {
        modifiedCount++;
    }
    
    // Progress indicator
    if (processedCount % 100 === 0) {
        console.log(`Progress: ${processedCount}/${allFiles.length} files processed...`);
    }
}

console.log(`\n🎉 Completed!`);
console.log(`📊 Statistics:`);
console.log(`   - Files processed: ${processedCount}`);
console.log(`   - Files modified: ${modifiedCount}`);
console.log(`   - Files unchanged: ${processedCount - modifiedCount}`);

// Additional cleanup for specific file types
console.log('\n🧹 Performing additional cleanup...');

// Remove any remaining organization model files
const organizationModelPaths = [
    'server/platform/models/organization.model.js',
    'server/platform/system/models/organization.model.js',
    'server/models/organization.model.js'
];

for (const modelPath of organizationModelPaths) {
    const fullPath = path.join(projectRoot, modelPath);
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
            console.log(`🗑️  Deleted: ${modelPath}`);
        } catch (error) {
            console.warn(`Warning: Could not delete ${modelPath}: ${error.message}`);
        }
    }
}

console.log('\n✨ organization and location removal completed successfully!');