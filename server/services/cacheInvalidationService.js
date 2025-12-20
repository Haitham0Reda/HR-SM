/**
 * Cache Invalidation Service
 * Implements intelligent cache invalidation strategies for data consistency
 * Handles automatic invalidation based on data changes and relationships
 */

import cacheService from './cacheService.js';
import logger from '../utils/logger.js';

class CacheInvalidationService {
    constructor() {
        this.invalidationRules = new Map();
        this.setupInvalidationRules();
    }

    /**
     * Setup cache invalidation rules for different data types
     */
    setupInvalidationRules() {
        // User-related invalidations
        this.invalidationRules.set('user', {
            patterns: [
                'user:*',
                'tenant:*:users',
                'tenant:*:user_count',
                'tenant:*:active_users'
            ],
            dependencies: ['tenant_metrics', 'user_permissions']
        });

        // Tenant-related invalidations
        this.invalidationRules.set('tenant', {
            patterns: [
                'tenant:*',
                'platform:tenants',
                'platform:tenant_stats'
            ],
            dependencies: ['user', 'license', 'modules']
        });

        // License-related invalidations
        this.invalidationRules.set('license', {
            patterns: [
                'license:*',
                'tenant:*:license',
                'tenant:*:modules',
                'platform:license_stats'
            ],
            dependencies: ['tenant', 'modules']
        });

        // Module-related invalidations
        this.invalidationRules.set('module', {
            patterns: [
                'module:*',
                'tenant:*:modules',
                'tenant:*:enabled_modules'
            ],
            dependencies: ['license', 'tenant']
        });

        // Insurance policy invalidations
        this.invalidationRules.set('insurance_policy', {
            patterns: [
                'insurance:policy:*',
                'insurance:tenant:*:policies',
                'insurance:employee:*:policies',
                'insurance:reports:*'
            ],
            dependencies: ['insurance_claim', 'family_member']
        });

        // Insurance claim invalidations
        this.invalidationRules.set('insurance_claim', {
            patterns: [
                'insurance:claim:*',
                'insurance:policy:*:claims',
                'insurance:tenant:*:claims',
                'insurance:reports:*'
            ],
            dependencies: ['insurance_policy']
        });

        // Family member invalidations
        this.invalidationRules.set('family_member', {
            patterns: [
                'insurance:family:*',
                'insurance:policy:*:family',
                'insurance:employee:*:family'
            ],
            dependencies: ['insurance_policy']
        });

        // Performance metrics invalidations
        this.invalidationRules.set('metrics', {
            patterns: [
                'metrics:*',
                'platform:metrics',
                'tenant:*:metrics'
            ],
            dependencies: []
        });

        // Audit log invalidations
        this.invalidationRules.set('audit_log', {
            patterns: [
                'audit:*',
                'platform:audit_stats',
                'tenant:*:audit'
            ],
            dependencies: []
        });
    }

    /**
     * Invalidate cache for specific entity type and ID
     * @param {string} entityType - Type of entity (user, tenant, license, etc.)
     * @param {string} entityId - Entity ID
     * @param {string} tenantId - Optional tenant ID for multi-tenant isolation
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async invalidateEntity(entityType, entityId, tenantId = null) {
        try {
            let totalInvalidated = 0;
            const rules = this.invalidationRules.get(entityType);

            if (!rules) {
                logger.warn('No invalidation rules found for entity type', { entityType });
                return 0;
            }

            // Invalidate direct patterns
            for (const pattern of rules.patterns) {
                let invalidationPattern = pattern;
                
                // Replace placeholders with actual values
                if (tenantId) {
                    invalidationPattern = invalidationPattern.replace('*', `${tenantId}:*`);
                }
                if (entityId) {
                    invalidationPattern = invalidationPattern.replace(':*', `:${entityId}:*`);
                }

                const invalidated = await cacheService.delPattern(invalidationPattern);
                totalInvalidated += invalidated;
                
                if (invalidated > 0) {
                    logger.debug('Cache invalidated', { 
                        entityType, 
                        entityId, 
                        tenantId, 
                        pattern: invalidationPattern, 
                        count: invalidated 
                    });
                }
            }

            // Invalidate dependent entities
            for (const dependency of rules.dependencies) {
                const dependentInvalidated = await this.invalidateDependentEntity(dependency, entityId, tenantId);
                totalInvalidated += dependentInvalidated;
            }

            logger.info('Entity cache invalidation completed', { 
                entityType, 
                entityId, 
                tenantId, 
                totalInvalidated 
            });

            return totalInvalidated;
        } catch (error) {
            logger.error('Error invalidating entity cache', { 
                entityType, 
                entityId, 
                tenantId, 
                error: error.message 
            });
            return 0;
        }
    }

    /**
     * Invalidate cache for dependent entities
     * @param {string} dependentType - Type of dependent entity
     * @param {string} parentId - Parent entity ID
     * @param {string} tenantId - Optional tenant ID
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async invalidateDependentEntity(dependentType, parentId, tenantId = null) {
        try {
            const rules = this.invalidationRules.get(dependentType);
            if (!rules) {
                return 0;
            }

            let totalInvalidated = 0;
            for (const pattern of rules.patterns) {
                let invalidationPattern = pattern;
                
                if (tenantId) {
                    invalidationPattern = invalidationPattern.replace('*', `${tenantId}:*`);
                }

                const invalidated = await cacheService.delPattern(invalidationPattern);
                totalInvalidated += invalidated;
            }

            return totalInvalidated;
        } catch (error) {
            logger.error('Error invalidating dependent entity cache', { 
                dependentType, 
                parentId, 
                tenantId, 
                error: error.message 
            });
            return 0;
        }
    }

    /**
     * Invalidate all cache for a specific tenant
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async invalidateTenant(tenantId) {
        try {
            const pattern = `hrms:*:tenant:${tenantId}:*`;
            const invalidated = await cacheService.delPattern(pattern);
            
            logger.info('Tenant cache invalidated', { tenantId, count: invalidated });
            return invalidated;
        } catch (error) {
            logger.error('Error invalidating tenant cache', { tenantId, error: error.message });
            return 0;
        }
    }

    /**
     * Invalidate cache based on Mongoose model changes
     * @param {string} modelName - Mongoose model name
     * @param {Object} document - Changed document
     * @param {string} operation - Operation type (create, update, delete)
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async invalidateModelCache(modelName, document, operation) {
        try {
            let entityType = this.mapModelToEntityType(modelName);
            if (!entityType) {
                logger.debug('No cache invalidation mapping for model', { modelName });
                return 0;
            }

            const entityId = document._id?.toString();
            const tenantId = document.tenantId?.toString();

            // Special handling for different operations
            if (operation === 'delete') {
                // For deletions, we might need to invalidate more broadly
                return await this.invalidateEntity(entityType, entityId, tenantId);
            } else if (operation === 'update') {
                // For updates, check if critical fields changed
                return await this.handleUpdateInvalidation(entityType, document, tenantId);
            } else if (operation === 'create') {
                // For creates, invalidate list caches
                return await this.handleCreateInvalidation(entityType, document, tenantId);
            }

            return 0;
        } catch (error) {
            logger.error('Error invalidating model cache', { 
                modelName, 
                operation, 
                error: error.message 
            });
            return 0;
        }
    }

    /**
     * Map Mongoose model names to entity types
     * @param {string} modelName - Mongoose model name
     * @returns {string|null} Entity type or null if no mapping
     */
    mapModelToEntityType(modelName) {
        const mapping = {
            'User': 'user',
            'Tenant': 'tenant',
            'License': 'license',
            'Module': 'module',
            'InsurancePolicy': 'insurance_policy',
            'InsuranceClaim': 'insurance_claim',
            'FamilyMember': 'family_member',
            'AuditLog': 'audit_log',
            'SystemMetrics': 'metrics'
        };

        return mapping[modelName] || null;
    }

    /**
     * Handle cache invalidation for update operations
     * @param {string} entityType - Entity type
     * @param {Object} document - Updated document
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async handleUpdateInvalidation(entityType, document, tenantId) {
        // Check if critical fields were modified
        const criticalFields = this.getCriticalFields(entityType);
        const modifiedPaths = document.modifiedPaths ? document.modifiedPaths() : [];
        
        const hasCriticalChanges = criticalFields.some(field => 
            modifiedPaths.includes(field)
        );

        if (hasCriticalChanges) {
            return await this.invalidateEntity(entityType, document._id?.toString(), tenantId);
        }

        return 0;
    }

    /**
     * Handle cache invalidation for create operations
     * @param {string} entityType - Entity type
     * @param {Object} document - Created document
     * @param {string} tenantId - Tenant ID
     * @returns {Promise<number>} Number of cache keys invalidated
     */
    async handleCreateInvalidation(entityType, document, tenantId) {
        // Invalidate list caches when new entities are created
        const listPatterns = [
            `hrms:${entityType}:tenant:${tenantId}:list:*`,
            `hrms:${entityType}:tenant:${tenantId}:count`,
            `hrms:platform:${entityType}_stats`
        ];

        let totalInvalidated = 0;
        for (const pattern of listPatterns) {
            const invalidated = await cacheService.delPattern(pattern);
            totalInvalidated += invalidated;
        }

        return totalInvalidated;
    }

    /**
     * Get critical fields for each entity type
     * @param {string} entityType - Entity type
     * @returns {Array<string>} Array of critical field names
     */
    getCriticalFields(entityType) {
        const criticalFields = {
            'user': ['status', 'role', 'permissions', 'tenantId'],
            'tenant': ['status', 'plan', 'modules', 'restrictions'],
            'license': ['status', 'expiresAt', 'features', 'activations'],
            'module': ['enabled', 'configuration'],
            'insurance_policy': ['status', 'coverageAmount', 'premium'],
            'insurance_claim': ['status', 'approvedAmount'],
            'family_member': ['status', 'relationship']
        };

        return criticalFields[entityType] || [];
    }

    /**
     * Schedule periodic cache cleanup
     * @param {number} intervalMinutes - Cleanup interval in minutes
     */
    scheduleCleanup(intervalMinutes = 60) {
        setInterval(async () => {
            try {
                logger.info('Starting scheduled cache cleanup');
                
                // Clean up expired entries (Redis handles this automatically with TTL)
                // But we can add custom cleanup logic here if needed
                
                const stats = cacheService.getStats();
                logger.info('Cache cleanup completed', { stats });
            } catch (error) {
                logger.error('Error during scheduled cache cleanup', { error: error.message });
            }
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Get invalidation statistics
     * @returns {Object} Invalidation statistics
     */
    getStats() {
        return {
            rulesCount: this.invalidationRules.size,
            supportedEntities: Array.from(this.invalidationRules.keys()),
            cacheStats: cacheService.getStats()
        };
    }
}

// Export singleton instance
const cacheInvalidationService = new CacheInvalidationService();
export default cacheInvalidationService;