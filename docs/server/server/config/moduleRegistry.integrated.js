import { MODULES } from '../shared/constants/modules.js';

// Module registry for dynamic loading
export const moduleRegistry = {
    // New modular system routes
    [MODULES.HR_CORE]: {
        routes: {
            auth: () => import('../modules/hr-core/auth/routes.js'),
            users: () => import('../modules/hr-core/users/routes.js'),
            tenant: () => import('../modules/hr-core/routes/tenantRoutes.js'),
            holidays: () => import('../modules/hr-core/holidays/routes.js'),
            overtime: () => import('../modules/hr-core/overtime/routes.js'),
            requests: () => import('../modules/hr-core/requests/routes.js')
        },
        basePath: '/api/v1/hr-core',
        modular: true
    },
    [MODULES.TASKS]: {
        routes: {
            tasks: () => import('../modules/tasks/routes/taskRoutes.js'),
            reports: () => import('../modules/tasks/routes/taskReportRoutes.js')
        },
        basePath: '/api/v1/tasks',
        modular: true
    },
    // Updated modules with new route locations
    [MODULES.ATTENDANCE]: {
        routes: {
            attendance: () => import('../modules/hr-core/attendance/routes.js')
        },
        basePath: '/api/v1/attendance',
        modular: true
    },
    [MODULES.LEAVE]: {
        routes: {
            missions: () => import('../modules/hr-core/missions/routes.js'),
            vacations: () => import('../modules/hr-core/vacations/routes.js'),
            permissionRequests: () => import('../modules/hr-core/requests/routes/permissionRequest.routes.js')
        },
        basePath: '/api/v1/leave',
        modular: true
    },
    [MODULES.PAYROLL]: {
        routes: {
            payroll: () => import('../modules/payroll/routes/payroll.routes.js')
        },
        basePath: '/api/v1/payroll',
        legacy: true
    },
    [MODULES.DOCUMENTS]: {
        routes: {
            documents: () => import('../modules/documents/routes/document.routes.js'),
            templates: () => import('../modules/documents/routes/documentTemplate.routes.js'),
            hardcopies: () => import('../modules/documents/routes/hardcopy.routes.js')
        },
        basePath: '/api/v1/documents',
        legacy: true
    },
    [MODULES.COMMUNICATION]: {
        routes: {
            announcements: () => import('../modules/announcements/routes/announcement.routes.js'),
            notifications: () => import('../modules/notifications/routes/notification.routes.js'),
            surveys: () => import('../modules/surveys/routes/survey.routes.js')
        },
        basePath: '/api/v1/communication',
        legacy: true
    },
    [MODULES.REPORTING]: {
        routes: {
            reports: () => import('../modules/reports/routes/report.routes.js'),
            analytics: () => import('../modules/analytics/routes/analytics.routes.js')
        },
        basePath: '/api/v1/reporting',
        legacy: true
    }
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

            const routePath = module.legacy
                ? `${module.basePath}/${routeName}`
                : `${module.basePath}/${routeName}`;

            app.use(routePath, router);

            const moduleType = module.modular ? '[MODULAR]' : '[LEGACY]';
            console.log(`✓ ${moduleType} Loaded route: ${routePath}`);
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

// Load all legacy modules (for backward compatibility)
export const loadLegacyModules = async (app) => {
    const legacyModules = Object.keys(moduleRegistry).filter(
        key => moduleRegistry[key].legacy
    );

    console.log('🔧 Loading legacy modules...');
    for (const moduleName of legacyModules) {
        await loadModuleRoutes(app, moduleName);
    }
};

export default {
    moduleRegistry,
    loadModuleRoutes,
    loadCoreRoutes,
    loadOptionalModuleRoutes,
    loadLegacyModules
};
