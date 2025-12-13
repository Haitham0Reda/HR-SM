/**
 * Script to update remaining /app/ paths to company routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDir = path.join(__dirname, '../../client/hr-app/src');

function updateFileWithCompanyRoutes(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        // Check if file needs useCompanyRouting import
        const hasAppPaths = content.includes('/app/');
        const hasCompanyRouting = content.includes('useCompanyRouting');
        const hasReactImport = content.includes('import React') || content.includes('import { ');
        
        if (hasAppPaths && !hasCompanyRouting && hasReactImport) {
            // Add useCompanyRouting import
            const importMatch = content.match(/(import.*from ['"]react['"];?\n)/);
            if (importMatch) {
                const newImport = importMatch[1] + "import { useCompanyRouting } from '../hooks/useCompanyRouting';\n";
                content = content.replace(importMatch[1], newImport);
                hasChanges = true;
            } else {
                // Add at the beginning of imports
                const firstImportMatch = content.match(/(import.*\n)/);
                if (firstImportMatch) {
                    const newImport = "import { useCompanyRouting } from '../hooks/useCompanyRouting';\n" + firstImportMatch[1];
                    content = content.replace(firstImportMatch[1], newImport);
                    hasChanges = true;
                }
            }
            
            // Add getCompanyRoute hook usage
            const componentMatch = content.match(/(const \w+ = \(\) => \{)/);
            if (componentMatch) {
                const newHook = componentMatch[1] + '\n    const { getCompanyRoute } = useCompanyRouting();';
                content = content.replace(componentMatch[1], newHook);
                hasChanges = true;
            }
        }
        
        // Replace /app/ paths with getCompanyRoute calls
        const replacements = [
            // path: '/app/...' -> path: getCompanyRoute('/...')
            {
                from: /path:\s*['"]\/app\/([^'"]+)['"]/g,
                to: "path: getCompanyRoute('/$1')"
            },
            // route: '/app/...' -> route: getCompanyRoute('/...')
            {
                from: /route:\s*['"]\/app\/([^'"]+)['"]/g,
                to: "route: getCompanyRoute('/$1')"
            },
            // to="/app/..." -> to={getCompanyRoute("/...")}
            {
                from: /to=['"]\/app\/([^'"]+)['"]/g,
                to: 'to={getCompanyRoute("/$1")}'
            },
            // navigate('/app/...') -> navigate(getCompanyRoute('/...'))
            {
                from: /navigate\(['"]\/app\/([^'"]+)['"]\)/g,
                to: "navigate(getCompanyRoute('/$1'))"
            },
            // navigate(`/app/...`) -> navigate(getCompanyRoute(`/...`))
            {
                from: /navigate\(`\/app\/([^`]+)`\)/g,
                to: "navigate(getCompanyRoute(`/$1`))"
            },
            // '/app/...' in strings (for breadcrumbs, etc.)
            {
                from: /['"]\/app\/([^'"]+)['"]/g,
                to: "getCompanyRoute('/$1')"
            }
        ];
        
        replacements.forEach(replacement => {
            const beforeCount = (content.match(replacement.from) || []).length;
            content = content.replace(replacement.from, replacement.to);
            const afterCount = (content.match(replacement.from) || []).length;
            if (beforeCount > afterCount) {
                hasChanges = true;
                console.log(`  - Updated ${beforeCount - afterCount} paths`);
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

function updateAllRemainingPaths() {
    console.log('Updating remaining /app/ paths...\n');
    
    const filesToUpdate = [
        'pages/settings/SystemSettingsPage.jsx',
        'pages/dashboard/Dashboard.jsx',
        'components/DashboardHeader.jsx',
        'components/DashboardSidebar.jsx',
        'components/EmployeeCreate.jsx',
        'components/EmployeeEdit.jsx',
        'components/EmployeeForm.jsx',
        'components/EmployeeList.jsx',
        'components/EmployeeShow.jsx',
        'components/SurveyRedirect.jsx',
        'components/users/UserCredentialPDF.jsx',
        'components/tasks/TaskList.jsx',
        'components/surveys/SurveyForm.jsx'
    ];
    
    let totalUpdated = 0;
    
    for (const file of filesToUpdate) {
        const filePath = path.join(clientDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`Processing: ${file}`);
            if (updateFileWithCompanyRoutes(filePath)) {
                totalUpdated++;
                console.log(`  ✅ Updated`);
            } else {
                console.log(`  - No changes needed`);
            }
        } else {
            console.log(`  ⚠️  File not found: ${file}`);
        }
    }
    
    console.log(`\n✅ Remaining paths update complete! Updated ${totalUpdated} files.`);
}

updateAllRemainingPaths();