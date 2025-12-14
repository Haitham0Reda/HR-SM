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
