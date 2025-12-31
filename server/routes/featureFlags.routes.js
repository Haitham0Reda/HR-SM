import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Get all feature flags
router.get('/', async (req, res) => {
    try {
        const { environment, status } = req.query;
        
        // Mock feature flags data
        let featureFlags = [
            {
                id: 1,
                name: 'new_dashboard_ui',
                displayName: 'New Dashboard UI',
                description: 'Enable the new dashboard user interface',
                enabled: true,
                environment: 'development',
                rolloutPercentage: 100,
                conditions: {
                    userRoles: ['admin', 'hr'],
                    tenants: ['techcorp_solutions']
                },
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-15T10:30:00Z'
            },
            {
                id: 2,
                name: 'advanced_reporting',
                displayName: 'Advanced Reporting',
                description: 'Enable advanced analytics and reporting features',
                enabled: false,
                environment: 'development',
                rolloutPercentage: 0,
                conditions: {
                    userRoles: ['admin'],
                    licenseTypes: ['enterprise']
                },
                createdAt: '2025-01-10T00:00:00Z',
                updatedAt: '2025-01-20T14:15:00Z'
            },
            {
                id: 3,
                name: 'mobile_app_integration',
                displayName: 'Mobile App Integration',
                description: 'Enable mobile application integration features',
                enabled: true,
                environment: 'development',
                rolloutPercentage: 50,
                conditions: {
                    userRoles: ['employee', 'hr', 'admin']
                },
                createdAt: '2025-01-05T00:00:00Z',
                updatedAt: '2025-01-25T09:45:00Z'
            },
            {
                id: 4,
                name: 'ai_powered_insights',
                displayName: 'AI-Powered Insights',
                description: 'Enable AI-driven analytics and insights',
                enabled: false,
                environment: 'development',
                rolloutPercentage: 0,
                conditions: {
                    userRoles: ['admin'],
                    licenseTypes: ['premium', 'enterprise']
                },
                createdAt: '2025-01-12T00:00:00Z',
                updatedAt: '2025-01-22T16:20:00Z'
            }
        ];

        // Apply filters
        if (environment) {
            featureFlags = featureFlags.filter(flag => flag.environment === environment);
        }
        if (status) {
            const isEnabled = status === 'enabled';
            featureFlags = featureFlags.filter(flag => flag.enabled === isEnabled);
        }

        res.json({
            success: true,
            data: featureFlags,
            message: 'Feature flags retrieved successfully',
            total: featureFlags.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve feature flags',
            error: error.message
        });
    }
});

// Get specific feature flag
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock feature flag data
        const featureFlag = {
            id: parseInt(id),
            name: `feature_flag_${id}`,
            displayName: `Feature Flag #${id}`,
            description: 'Sample feature flag description',
            enabled: true,
            environment: 'development',
            rolloutPercentage: 75,
            conditions: {
                userRoles: ['admin', 'hr'],
                tenants: ['techcorp_solutions'],
                userAttributes: {
                    department: ['IT', 'HR']
                }
            },
            usage: {
                totalChecks: 1250,
                enabledChecks: 937,
                lastChecked: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: featureFlag,
            message: 'Feature flag retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve feature flag',
            error: error.message
        });
    }
});

// Create new feature flag
router.post('/', async (req, res) => {
    try {
        const { 
            name, 
            displayName, 
            description, 
            enabled = false, 
            environment = 'development',
            rolloutPercentage = 0,
            conditions = {}
        } = req.body;
        
        if (!name || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'Name and display name are required'
            });
        }

        // Mock feature flag creation
        const newFeatureFlag = {
            id: Date.now(),
            name,
            displayName,
            description,
            enabled,
            environment,
            rolloutPercentage,
            conditions,
            usage: {
                totalChecks: 0,
                enabledChecks: 0,
                lastChecked: null
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            success: true,
            data: newFeatureFlag,
            message: 'Feature flag created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create feature flag',
            error: error.message
        });
    }
});

// Update feature flag
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Mock feature flag update
        const updatedFeatureFlag = {
            id: parseInt(id),
            ...updateData,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: updatedFeatureFlag,
            message: 'Feature flag updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update feature flag',
            error: error.message
        });
    }
});

// Delete feature flag
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        res.json({
            success: true,
            message: `Feature flag ${id} deleted successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete feature flag',
            error: error.message
        });
    }
});

// Check if feature flag is enabled for current user
router.get('/:name/check', async (req, res) => {
    try {
        const { name } = req.params;
        const user = req.user;
        
        // Mock feature flag evaluation
        // In a real implementation, this would check conditions, rollout percentage, etc.
        const isEnabled = Math.random() > 0.5; // Random for demo
        
        res.json({
            success: true,
            data: {
                flagName: name,
                enabled: isEnabled,
                userId: user?.id,
                evaluatedAt: new Date(),
                reason: isEnabled ? 'User meets all conditions' : 'User does not meet rollout criteria'
            },
            message: 'Feature flag evaluated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to evaluate feature flag',
            error: error.message
        });
    }
});

// Toggle feature flag
router.post('/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock toggle operation
        const newState = Math.random() > 0.5; // Random for demo
        
        res.json({
            success: true,
            data: {
                id: parseInt(id),
                enabled: newState,
                toggledAt: new Date(),
                toggledBy: req.user?.id
            },
            message: `Feature flag ${newState ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to toggle feature flag',
            error: error.message
        });
    }
});

export default router;