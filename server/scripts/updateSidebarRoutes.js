/**
 * Script to update sidebar routes from /app/ to company routes
 */

import fs from 'fs';
import path from 'path';

const sidebarPath = path.join(process.cwd(), 'client/hr-app/src/components/DashboardSidebar.jsx');

function updateSidebarRoutes() {
    try {
        console.log('Updating sidebar routes...');
        
        // Read the file
        let content = fs.readFileSync(sidebarPath, 'utf8');
        
        // Define the replacements
        const replacements = [
            // Replace href="/app/..." with href={getCompanyRoute("/...")}
            {
                from: /href="\/app\/([^"]+)"/g,
                to: 'href={getCompanyRoute("/$1")}'
            },
            // Replace selected={!!matchPath('/app/...', pathname)} with selected={!!matchPath(getCompanyRoute('/...'), pathname)}
            {
                from: /selected=\{\!\!matchPath\('\/app\/([^']+)', pathname\)\}/g,
                to: 'selected={!!matchPath(getCompanyRoute(\'/$1\'), pathname)}'
            },
            // Replace selected={pathname.startsWith('/app/...')} with selected={pathname.startsWith(getCompanyRoute('/...'))}
            {
                from: /selected=\{pathname\.startsWith\('\/app\/([^']+)'\)\}/g,
                to: 'selected={pathname.startsWith(getCompanyRoute(\'/$1\'))}'
            }
        ];
        
        // Apply replacements
        let updatedContent = content;
        replacements.forEach((replacement, index) => {
            const beforeCount = (updatedContent.match(replacement.from) || []).length;
            updatedContent = updatedContent.replace(replacement.from, replacement.to);
            const afterCount = (updatedContent.match(replacement.from) || []).length;
            console.log(`Replacement ${index + 1}: ${beforeCount - afterCount} changes made`);
        });
        
        // Write the updated content back
        fs.writeFileSync(sidebarPath, updatedContent, 'utf8');
        
        console.log('✅ Sidebar routes updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating sidebar routes:', error.message);
    }
}

updateSidebarRoutes();