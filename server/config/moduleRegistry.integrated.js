import { MODULES } from '../shared/constants/modules.js';

// Module registry for dynamic loading
export const moduleRegistry = {
    // New modular system routes
    [MODULES.HR_CORE]: {
        routes: {
            auth: () => import('../modules/hr-core/routes/authRoutes.js'),
            users: () => import('../modules/hr-core/routes/userRoutes.js'),
            tenant: () => import('../modules/hr-core/routes/tenantRoutes.js')
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
    // Existing modules mapped to new structure (legacy routes)
    [MODULES.ATTENDANCE]: {
        routes: {
            attendance: () => import('../routes/attendance.routes.js')
        },
        basePath: '/api/v1/attendance',
        legacy: true
    },
    [MODULES.LEAVE]: {
        routes: {
            missions: () => import('../routes/mission.routes.js'),
            mixedVacations: () => import('../routes/mixedVacation.routes.js'),
            permissionRequests: () => import('../routes/permissionRequest.routes.js')
        },
        basePath: '/api/v1/leave',
        legacy: true
    },
    [MODULES.PAYROLL]: {
        routes: {
            payroll: () => import('../routes/payroll.routes.js')
        },
        basePath: '/api/v1/payroll',
        legacy: true
    },
    [MODULES.DOCUMENTS]: {
        routes: {
            documents: () => import('../routes/document.routes.js'),
            templates: () => import('../routes/documentTemplate.routes.js'),
            hardcopies: () => import('../routes/hardcopy.routes.js')
        },
        basePath: '/api/v1/documents',
        legacy: true
    },
    [MODULES.COMMUNICATION]: {
        routes: {
            announcements: () => import('../routes/announcement.routes.js'),
            notifications: () => import('../routes/notification.routes.js'),
            surveys: () => import('../routes/survey.routes.js')
        },
        basePath: '/api/v1/communication',
        legacy: true
    },
    [MODULES.REPORTING]: {
        routes: {
            reports: () => import('../routes/report.routes.js'),
            analytics: () => import('../routes/analytics.routes.js')
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
