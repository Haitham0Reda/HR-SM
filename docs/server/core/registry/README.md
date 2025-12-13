# Module Registry System

The Module Registry System provides dynamic module discovery, loading, and management for the enterprise SaaS platform. It enables runtime module configuration, tenant-specific module loading, and feature flag management.

## Components

### 1. Module Registry (`moduleRegistry.js`)

Central registry for all available modules in the system.

```javascript
import moduleRegistry from './core/registry/moduleRegistry.js';

// Initialize (discovers all modules automatically)
await moduleRegistry.initialize();

// Get a module
const module = moduleRegistry.getModule('hr-core');

// Check if module exists
const exists = moduleRegistry.hasModule('tasks');

// Get all modules
const allModules = moduleRegistry.getAllModules();

// Get module dependencies
const deps = moduleRegistry.getModuleDependencies('clinic');
// Returns: { dependencies: ['hr-core'], optionalDependencies: ['email-service'] }
```

### 2. Module Loader (`moduleLoader.js`)

Dynamically loads modules based on tenant configuration.

```javascript
import moduleLoader from './core/registry/moduleLoader.js';

// Load modules for a tenant
const loadedModules = await moduleLoader.loadModulesForTenant(tenant, app);

// Enable a module at runtime (no restart required)
await moduleLoader.enableModuleForTenant('tenant_123', 'tasks', app);

// Disable a module at runtime
await moduleLoader.disableModuleForTenant('tenant_123', 'tasks');

// Check if module is loaded for tenant
const isLoaded = moduleLoader.isModuleLoadedForTenant('tenant_123', 'tasks');

// Get all modules for a tenant
const modules = moduleLoader.getModulesForTenant('tenant_123');
```

### 3. Feature Flag Service (`featureFlagService.js`)

Manages feature flags with optional Redis caching.

```javascript
import featureFlagService from './core/registry/featureFlagService.js';

// Initialize with Redis (optional)
featureFlagService.initialize(redisClient, 300); // 5 minute TTL

// Get all feature flags for a tenant
const flags = await featureFlagService.getFeatureFlags(tenant);

// Check if a feature is enabled
const enabled = await featureFlagService.isFeatureEnabled(tenant, 'advanced-reporting');

// Check if a module is enabled
const moduleEnabled = featureFlagService.isModuleEnabled(tenant, 'tasks');

// Update feature flags
await featureFlagService.updateFeatureFlags('tenant_123', {
    'advanced-reporting': true,
    'bulk-import': false
});

// Invalidate cache
await featureFlagService.invalidateCache('tenant_123');
```

### 4. Module Initializer (`moduleInitializer.js`)

Orchestrates the initialization of the entire module system.

```javascript
import moduleInitializer from './core/registry/moduleInitializer.js';

// Initialize the entire system
await moduleInitializer.initialize(app, {
    redisClient: redisClient,
    cacheTTL: 300
});

// Load modules for a tenant
await moduleInitializer.loadModulesForTenant(tenant);

// Enable/disable modules
await moduleInitializer.enableModuleForTenant('tenant_123', 'tasks');
await moduleInitializer.disableModuleForTenant('tenant_123', 'tasks');

// Get system statistics
const stats = moduleInitializer.getStats();
```

### 5. Dependency Resolver (`dependencyResolver.js`)

Resolves and validates module dependencies.

```javascript
import { 
    resolveDependencies, 
    canDisableModule,
    detectCircularDependencies,
    getDependencyTree,
    validateDependencies,
    getLoadOrder
} from './core/registry/dependencyResolver.js';

// Check if module can be enabled
const result = resolveDependencies('clinic', ['hr-core']);
// Returns: { canEnable: true, missingDependencies: [], ... }

// Check if module can be disabled
const canDisable = canDisableModule('hr-core', ['clinic', 'tasks']);
// Returns: { canDisable: false, dependentModules: ['clinic', 'tasks'], ... }

// Detect circular dependencies
const circular = detectCircularDependencies('module-a');
// Returns: { hasCircular: false } or { hasCircular: true, circularPath: [...] }

// Get full dependency tree
const tree = getDependencyTree('clinic');
// Returns: ['hr-core']

// Validate all dependencies exist
const valid = validateDependencies('clinic');
// Returns: { valid: true, message: '...' }

// Get load order for modules
const order = getLoadOrder(['clinic', 'tasks', 'hr-core']);
// Returns: ['hr-core', 'clinic', 'tasks'] (dependencies first)
```

## Module Configuration

Each module must have a `module.config.js` file in its directory:

```javascript
// server/modules/my-module/module.config.js
export default {
    name: 'my-module',
    displayName: 'My Module',
    version: '1.0.0',
    description: 'Description of what this module does',
    author: 'Your Name',
    category: 'category-name',
    
    // Required dependencies (must be enabled)
    dependencies: ['hr-core'],
    
    // Optional dependencies (graceful degradation if missing)
    optionalDependencies: ['email-service'],
    
    // Modules that can use this module
    providesTo: ['other-module'],
    
    // Pricing information
    pricing: {
        tier: 'premium',
        monthlyPrice: 29.99,
        yearlyPrice: 299.99
    },
    
    // Feature flags
    features: {
        featureName: true
    },
    
    // API routes
    routes: {
        base: '/api/v1/my-module',
        endpoints: [
            { path: '/items', method: 'GET', auth: true },
            { path: '/items', method: 'POST', auth: true, roles: ['Admin'] }
        ]
    },
    
    // Database models
    models: ['MyModel', 'AnotherModel'],
    
    // Initialization function (optional)
    async initialize(app, tenantId) {
        // Module-specific initialization
        console.log(`Initializing my-module for tenant ${tenantId}`);
    },
    
    // Cleanup function (optional)
    async cleanup(tenantId) {
        // Module-specific cleanup
        console.log(`Cleaning up my-module for tenant ${tenantId}`);
    }
};
```

## Usage in Application

### Server Startup

```javascript
// server/index.js
import { initializeModuleSystem } from './app.js';

// Initialize module system during startup
await initializeModuleSystem({
    redisClient: redisClient,
    cacheTTL: 300
});
```

### Tenant Login

```javascript
// When a tenant logs in, load their modules
import { moduleInitializer } from './app.js';

// Get tenant from database
const tenant = await Tenant.findOne({ tenantId: 'tenant_123' });

// Load modules for this tenant
const loadedModules = await moduleInitializer.loadModulesForTenant(tenant);

console.log(`Loaded modules: ${loadedModules.join(', ')}`);
```

### Platform Admin Operations

```javascript
// Enable a module for a tenant
await moduleInitializer.enableModuleForTenant('tenant_123', 'tasks');

// Disable a module for a tenant
await moduleInitializer.disableModuleForTenant('tenant_123', 'tasks');

// Update tenant in database
await tenant.enableModule('tasks', 'admin_user_id');
await tenant.save();

// Invalidate feature flag cache
await featureFlagService.invalidateCache('tenant_123');
```

## Middleware Integration

### Module Guard Middleware

```javascript
import { moduleGuard } from './core/middleware/moduleGuard.js';

// Protect routes with module guard
router.use(moduleGuard('tasks'));

// This route is only accessible if 'tasks' module is enabled for the tenant
router.get('/tasks', async (req, res) => {
    // Route handler
});
```

### Feature Flag Middleware

```javascript
import featureFlagService from './core/registry/featureFlagService.js';

// Custom middleware to check feature flags
const requireFeature = (featureName) => {
    return async (req, res, next) => {
        const enabled = await featureFlagService.isFeatureEnabled(req.tenant, featureName);
        
        if (!enabled) {
            return res.status(403).json({
                success: false,
                message: `Feature ${featureName} is not enabled`
            });
        }
        
        next();
    };
};

// Use in routes
router.get('/advanced-report', requireFeature('advanced-reporting'), async (req, res) => {
    // Route handler
});
```

## Caching Strategy

The feature flag service uses a two-tier caching strategy:

1. **Redis Cache** (if available)
   - Shared across all application instances
   - TTL: 5 minutes (configurable)
   - Automatic invalidation on updates

2. **In-Memory Cache**
   - Fast fallback if Redis is unavailable
   - Per-instance cache
   - Cleared on updates

3. **Database** (ultimate source of truth)
   - Tenant configuration in MongoDB
   - Only queried on cache miss

### Cache Performance

- Redis cache hit: ~1ms
- In-memory cache hit: ~0.1ms
- Database query: ~10-50ms
- Expected cache hit rate: ~90%

## Error Handling

All module operations handle errors gracefully:

```javascript
try {
    await moduleLoader.loadModule('my-module', app, tenantId);
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        // Module doesn't exist
    } else if (error.code === 'MODULE_DEPENDENCY_MISSING') {
        // Dependencies not satisfied
    } else if (error.code === 'MODULE_LOAD_FAILED') {
        // Module failed to load
    }
}
```

Module loading failures don't crash the system:
- Failed modules are logged
- Other modules continue loading
- System remains operational

## Testing

### Unit Tests

```javascript
import { describe, test, expect } from '@jest/globals';
import moduleRegistry from './moduleRegistry.js';

describe('Module Registry', () => {
    test('should discover all modules', async () => {
        await moduleRegistry.initialize();
        const modules = moduleRegistry.getAllModules();
        expect(modules.length).toBeGreaterThan(0);
    });
    
    test('should validate module dependencies', () => {
        const module = moduleRegistry.getModule('clinic');
        expect(module.dependencies).toContain('hr-core');
    });
});
```

### Integration Tests

```javascript
import { describe, test, expect } from '@jest/globals';
import moduleLoader from './moduleLoader.js';

describe('Module Loader', () => {
    test('should load modules for tenant', async () => {
        const tenant = {
            tenantId: 'test_tenant',
            enabledModules: [
                { moduleId: 'hr-core' },
                { moduleId: 'tasks' }
            ]
        };
        
        const loaded = await moduleLoader.loadModulesForTenant(tenant, app);
        expect(loaded).toContain('hr-core');
        expect(loaded).toContain('tasks');
    });
});
```

## Performance Considerations

### Module Discovery

- Runs once at startup
- Scans `server/modules/` directory
- Minimal overhead (~10-50ms)

### Module Loading

- Lazy loading per tenant
- Modules loaded only when needed
- Routes registered dynamically

### Memory Usage

- Module registry: ~1KB per module
- Module loader: ~2KB per loaded module
- Feature flags: ~1KB per tenant (cached)
- Total overhead: ~10-20KB typical

## Troubleshooting

### Module Not Found

```
Error: Module not found in registry: my-module
```

**Solution**: Ensure `module.config.js` exists in `server/modules/my-module/`

### Missing Dependencies

```
Error: Cannot enable my-module: missing required dependencies: hr-core
```

**Solution**: Enable required dependencies first

### Circular Dependencies

```
Error: Circular dependency detected: module-a -> module-b -> module-a
```

**Solution**: Refactor modules to remove circular dependency

### Module Load Failed

```
Error: Failed to load module: my-module
```

**Solution**: Check module initialization code and logs for details

## Best Practices

1. **Always declare dependencies** - Be explicit about what your module needs
2. **Use optional dependencies** - For graceful degradation
3. **Validate on startup** - Check dependencies during initialization
4. **Handle errors gracefully** - Don't crash on module failures
5. **Cache feature flags** - Use Redis for multi-instance deployments
6. **Invalidate cache on updates** - Keep cache in sync with database
7. **Test module isolation** - Ensure modules work independently
8. **Document module APIs** - Clear documentation for module consumers

## Future Enhancements

- Module hot-reloading (update without restart)
- Module versioning and compatibility checks
- Module marketplace integration
- Module sandboxing for third-party modules
- Module analytics and usage tracking
- Module A/B testing
- Module rollback capabilities

## Related Documentation

- [Module Development Guide](../../../docs/MODULE_DEVELOPMENT_GUIDE.md)
- [Platform Admin Guide](../../../docs/PLATFORM_ADMIN_GUIDE.md)
- [API Documentation](../../../docs/API_DOCUMENTATION.md)
- [Architecture Overview](../../../docs/ARCHITECTURE.md)
