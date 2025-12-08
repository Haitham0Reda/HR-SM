// Integration test to verify license middleware is properly integrated with routes
import { MODULES } from '../../models/license.model.js';

/**
 * This test verifies that license middleware has been properly integrated
 * with all product module routes as specified in task 19.
 * 
 * Requirements validated: 1.2, 3.1
 */

describe('License Middleware Integration', () => {
    const routeModuleMapping = {
        'attendance.routes.js': MODULES.ATTENDANCE,
        'vacation.routes.js': MODULES.LEAVE,
        'sickLeave.routes.js': MODULES.LEAVE,
        'mission.routes.js': MODULES.LEAVE,
        'payroll.routes.js': MODULES.PAYROLL,
        'document.routes.js': MODULES.DOCUMENTS,
        'documentTemplate.routes.js': MODULES.DOCUMENTS,
        'announcement.routes.js': MODULES.COMMUNICATION,
        'notification.routes.js': MODULES.COMMUNICATION,
        'report.routes.js': MODULES.REPORTING,
        'analytics.routes.js': MODULES.REPORTING,
        'task.routes.js': MODULES.TASKS
    };

    const coreHRRoutes = [
        'user.routes.js',
        'role.routes.js',
        'department.routes.js',
        'position.routes.js'
    ];

    test('All product module routes should import requireModuleLicense', async () => {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        for (const [routeFile, expectedModule] of Object.entries(routeModuleMapping)) {
            const routePath = path.join(process.cwd(), 'server', 'routes', routeFile);
            const content = await fs.readFile(routePath, 'utf-8');
            
            // Check that the file imports requireModuleLicense
            expect(content).toContain('requireModuleLicense');
            expect(content).toContain('from \'../middleware/licenseValidation.middleware.js\'');
            
            // Check that the file imports MODULES
            expect(content).toContain('MODULES');
            expect(content).toContain('from \'../models/license.model.js\'');
            
            // Check that the file uses the correct module
            expect(content).toContain(`requireModuleLicense(MODULES.${Object.keys(MODULES).find(key => MODULES[key] === expectedModule)})`);
        }
    });

    test('Core HR routes should NOT import requireModuleLicense', async () => {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        for (const routeFile of coreHRRoutes) {
            const routePath = path.join(process.cwd(), 'server', 'routes', routeFile);
            const content = await fs.readFile(routePath, 'utf-8');
            
            // Check that the file does NOT import requireModuleLicense
            expect(content).not.toContain('requireModuleLicense');
            expect(content).not.toContain('licenseValidation.middleware');
        }
    });

    test('All product module routes should use router.use() with license middleware', async () => {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        for (const [routeFile] of Object.entries(routeModuleMapping)) {
            const routePath = path.join(process.cwd(), 'server', 'routes', routeFile);
            const content = await fs.readFile(routePath, 'utf-8');
            
            // Check that router.use() is called with requireModuleLicense
            expect(content).toMatch(/router\.use\(requireModuleLicense\(MODULES\.\w+\)\)/);
        }
    });

    test('License middleware should be applied before route handlers', async () => {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        for (const [routeFile] of Object.entries(routeModuleMapping)) {
            const routePath = path.join(process.cwd(), 'server', 'routes', routeFile);
            const content = await fs.readFile(routePath, 'utf-8');
            
            // Find the position of router.use(requireModuleLicense(...))
            const licenseMiddlewareMatch = content.match(/router\.use\(requireModuleLicense\(MODULES\.\w+\)\)/);
            if (licenseMiddlewareMatch) {
                const licenseMiddlewarePos = licenseMiddlewareMatch.index;
                
                // Find the position of the first route definition (router.get, router.post, etc.)
                const routeMatch = content.match(/router\.(get|post|put|delete|route)\(/);
                if (routeMatch) {
                    const routePos = routeMatch.index;
                    
                    // License middleware should come before route definitions
                    expect(licenseMiddlewarePos).toBeLessThan(routePos);
                }
            }
        }
    });

    test('Verify correct module mapping', () => {
        // Verify that the mapping is correct according to the task requirements
        expect(routeModuleMapping['attendance.routes.js']).toBe(MODULES.ATTENDANCE);
        expect(routeModuleMapping['vacation.routes.js']).toBe(MODULES.LEAVE);
        expect(routeModuleMapping['sickLeave.routes.js']).toBe(MODULES.LEAVE);
        expect(routeModuleMapping['mission.routes.js']).toBe(MODULES.LEAVE);
        expect(routeModuleMapping['payroll.routes.js']).toBe(MODULES.PAYROLL);
        expect(routeModuleMapping['document.routes.js']).toBe(MODULES.DOCUMENTS);
        expect(routeModuleMapping['documentTemplate.routes.js']).toBe(MODULES.DOCUMENTS);
        expect(routeModuleMapping['announcement.routes.js']).toBe(MODULES.COMMUNICATION);
        expect(routeModuleMapping['notification.routes.js']).toBe(MODULES.COMMUNICATION);
        expect(routeModuleMapping['report.routes.js']).toBe(MODULES.REPORTING);
        expect(routeModuleMapping['analytics.routes.js']).toBe(MODULES.REPORTING);
        expect(routeModuleMapping['task.routes.js']).toBe(MODULES.TASKS);
    });
});
