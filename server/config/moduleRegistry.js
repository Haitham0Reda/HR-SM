import { MODULES } from '../shared/constants/modules.js';

// Module registry for dynamic loading
export const moduleRegistry = {
    [MODULES.HR_CORE]: {
        routes: {
            auth: () => import('../modules/hr-core/routes/authRoutes.js'),
            users: () => import('../modules/hr-core/users/routes/user.routes.js'),
            departments: () => import('../modules/hr-core/users/routes/department.routes.js'),
            positions: () => import('../modules/hr-core/users/routes/position.routes.js'),
            roles: () => import('../modules/hr-core/users/routes/role.routes.js'),
            tenant: () => import('../modules/hr-core/routes/tenantRoutes.js'),
            attendance: () => import('../modules/hr-core/attendance/routes.js'),
            'attendance-devices': () => import('../modules/hr-core/attendance/attendanceDevice.routes.js'),
            holidays: () => import('../modules/hr-core/holidays/routes.js'),
            missions: () => import('../modules/hr-core/missions/routes.js'),
            overtime: () => import('../modules/hr-core/overtime/routes.js'),
            requests: () => import('../modules/hr-core/requests/routes.js'),
            vacations: () => import('../modules/hr-core/vacations/routes.js'),
            'sick-leaves': () => import('../modules/hr-core/vacations/routes/sickLeave.routes.js'),
            'forget-checks': () => import('../modules/hr-core/attendance/routes/forgetCheck.routes.js'),
            'resigned-employees': () => import('../modules/hr-core/users/routes/resignedEmployee.routes.js'),
            'backups': () => import('../modules/hr-core/routes/backup.routes.js'),
            dashboard: () => import('../modules/dashboard/routes/dashboard.routes.js')
        },
        basePath: '/api/v1'
    },
    [MODULES.TASKS]: {
        routes: {
            'tasks': () => import('../modules/tasks/routes/taskRoutes.js'),
            'task-reports': () => import('../modules/tasks/routes/taskReportRoutes.js')
        },
        basePath: '/api/v1'
    },
    [MODULES.DOCUMENTS]: {
        routes: {
            'documents': () => import('../modules/documents/routes/document.routes.js'),
            'document-templates': () => import('../modules/documents/routes/documentTemplate.routes.js'),
            'hardcopies': () => import('../modules/documents/routes/hardcopy.routes.js')
        },
        basePath: '/api/v1'
    },
    [MODULES.COMMUNICATION]: {
        routes: {
            'announcements': () => import('../modules/announcements/routes/announcement.routes.js'),
            'notifications': () => import('../modules/notifications/routes/notification.routes.js')
        },
        basePath: '/api/v1'
    },
    [MODULES.REPORTING]: {
        routes: {
            'reports': () => import('../modules/reports/routes/report.routes.js'),
            'analytics': () => import('../modules/analytics/routes/analytics.routes.js')
        },
        basePath: '/api/v1'
    },
    [MODULES.PAYROLL]: {
        routes: {
            'payroll': () => import('../modules/payroll/routes/payroll.routes.js')
        },
        basePath: '/api/v1'
    },
    [MODULES.LIFE_INSURANCE]: {
        routes: {
            'life-insurance': () => import('../modules/life-insurance/routes/insuranceRoutes.js')
        },
        basePath: '/api/v1'
    }
    // Add other modules here as they are implemented
};

// Load module routes dynamically
export const loadModuleRoutes = async (app, moduleName) => {
    const module = moduleRegistry[moduleName];

    if (!module) {
        console.warn(`Module ${moduleName} not found in registry`);
        return;
    }

    try {
        for (const [routeName, routeLoader] of Object.entries(module.routes)) {
            const routeModule = await routeLoader();
            const router = routeModule.default;

            const routePath = `${module.basePath}/${routeName}`;
            app.use(routePath, router);

            console.log(`✓ Loaded route: ${routePath}`);
            
            // Debug: Log the actual routes in the router
            if (routeName === 'users') {
                console.log('🔍 User routes loaded:');
                router.stack?.forEach(layer => {
                    if (layer.route) {
                        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
                        console.log(`   ${methods} ${routePath}${layer.route.path}`);
                    }
                });
            }
        }
    } catch (error) {
        console.error(`Error loading module ${moduleName}:`, error);
    }
};

// Load all core routes (always enabled)
export const loadCoreRoutes = async (app) => {
    await loadModuleRoutes(app, MODULES.HR_CORE);
};

// Load optional module routes
export const loadOptionalModuleRoutes = async (app, enabledModules) => {
    for (const moduleName of enabledModules) {
        if (moduleName !== MODULES.HR_CORE) {
            await loadModuleRoutes(app, moduleName);
        }
    }
};

export default { 
    moduleRegistry, 
    loadModuleRoutes, 
    loadCoreRoutes, 
    loadOptionalModuleRoutes
};
