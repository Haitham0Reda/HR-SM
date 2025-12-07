import { MODULES } from '../shared/constants/modules.js';

// Module registry for dynamic loading
export const moduleRegistry = {
    [MODULES.HR_CORE]: {
        routes: {
            auth: () => import('../modules/hr-core/routes/authRoutes.js'),
            users: () => import('../modules/hr-core/routes/userRoutes.js'),
            tenant: () => import('../modules/hr-core/routes/tenantRoutes.js')
        },
        basePath: '/api/v1/hr-core'
    },
    [MODULES.TASKS]: {
        routes: {
            tasks: () => import('../modules/tasks/routes/taskRoutes.js'),
            reports: () => import('../modules/tasks/routes/taskReportRoutes.js')
        },
        basePath: '/api/v1/tasks'
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

export default { moduleRegistry, loadModuleRoutes, loadCoreRoutes, loadOptionalModuleRoutes };
