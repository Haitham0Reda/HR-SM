/**
 * Script to update navigation calls from /app/ to company routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pagesDir = path.join(__dirname, '../../client/hr-app/src/pages');

function updateNavigationInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        // Check if file already imports useCompanyRouting
        const hasCompanyRouting = content.includes('useCompanyRouting');
        
        // Add import for useCompanyRouting if not present and file has navigate calls
        if (!hasCompanyRouting && content.includes('navigate(')) {
            // Find the line with useNavigate import
            const navigateImportMatch = content.match(/(import.*useNavigate.*from.*react-router-dom.*)/);
            if (navigateImportMatch) {
                const newImport = navigateImportMatch[1].replace(
                    'useNavigate',
                    'useNavigate'
                ) + '\nimport { useCompanyRouting } from \'../../hooks/useCompanyRouting\';';
                
                content = content.replace(navigateImportMatch[1], newImport);
                hasChanges = true;
            }
        }
        
        // Add getCompanyRoute destructuring if not present
        if (!content.includes('getCompanyRoute') && content.includes('navigate(')) {
            // Find where useNavigate is called
            const navigateHookMatch = content.match(/(const.*useNavigate\(\);)/);
            if (navigateHookMatch) {
                const newHook = navigateHookMatch[1] + '\n    const { getCompanyRoute } = useCompanyRouting();';
                content = content.replace(navigateHookMatch[1], newHook);
                hasChanges = true;
            }
        }
        
        // Replace navigate calls with /app/ paths
        const navigateReplacements = [
            // navigate('/app/...') -> navigate(getCompanyRoute('/...'))
            {
                from: /navigate\('\/app\/([^']+)'\)/g,
                to: 'navigate(getCompanyRoute(\'/$1\'))'
            },
            // navigate(`/app/...`) -> navigate(getCompanyRoute(`/...`))
            {
                from: /navigate\(`\/app\/([^`]+)`\)/g,
                to: 'navigate(getCompanyRoute(`/$1`))'
            }
        ];
        
        navigateReplacements.forEach(replacement => {
            const beforeCount = (content.match(replacement.from) || []).length;
            content = content.replace(replacement.from, replacement.to);
            const afterCount = (content.match(replacement.from) || []).length;
            if (beforeCount > afterCount) {
                hasChanges = true;
                console.log(`  - Updated ${beforeCount - afterCount} navigate calls`);
            }
        });
        
        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error.message);
        return false;
    }
}

function updateAllNavigationCalls() {
    console.log('Updating navigation calls in all page components...\n');
    
    let totalUpdated = 0;
    
    function processDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                processDirectory(itemPath);
            } else if (item.endsWith('.jsx') || item.endsWith('.js')) {
                console.log(`Processing: ${path.relative(pagesDir, itemPath)}`);
                if (updateNavigationInFile(itemPath)) {
                    totalUpdated++;
                    console.log(`  ✅ Updated`);
                } else {
                    console.log(`  - No changes needed`);
                }
            }
        }
    }
    
    processDirectory(pagesDir);
    
    console.log(`\n✅ Navigation update complete! Updated ${totalUpdated} files.`);
}

updateAllNavigationCalls();