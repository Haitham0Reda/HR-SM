// Position Controller
import Position from '../models/position.model.js';

export const getAllPositions = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        const positions = await models.Position.find({ tenantId: tenantId })
            .populate('department', 'name code');
        res.json({
            success: true,
            data: positions
        });
    } catch (err) {
        console.error('❌ Error fetching positions:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const createPosition = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        const position = new models.Position({
            ...req.body,
            tenantId: tenantId
        });
        await position.save();
        res.status(201).json({
            success: true,
            data: position
        });
    } catch (err) {
        console.error('❌ Error creating position:', err);
        res.status(400).json({ 
            success: false,
            message: err.message || 'Failed to create position'
        });
    }
};

export const getPositionById = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        const position = await models.Position.findOne({ 
            _id: req.params.id, 
            tenantId: tenantId 
        }).populate('department', 'name code');
        
        if (!position) {
            return res.status(404).json({ 
                success: false,
                message: 'Position not found' 
            });
        }
        
        res.json({
            success: true,
            data: position
        });
    } catch (err) {
        console.error('❌ Error fetching position:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

export const updatePosition = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        const position = await models.Position.findOneAndUpdate(
            { _id: req.params.id, tenantId: tenantId },
            req.body,
            { new: true }
        ).populate('department', 'name code');
        
        if (!position) {
            return res.status(404).json({ 
                success: false,
                message: 'Position not found' 
            });
        }
        
        res.json({
            success: true,
            data: position
        });
    } catch (err) {
        console.error('❌ Error updating position:', err);
        res.status(400).json({ 
            success: false,
            message: err.message || 'Failed to update position'
        });
    }
};

export const deletePosition = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID is required'
            });
        }

        // Use tenant-specific database connection
        const { default: multiTenantDB } = await import('../../../../config/multiTenant.js');
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Register models on tenant connection using utility
        let models;
        try {
            const { registerHRModels } = await import('../../../../utils/tenantModelRegistry.js');
            models = await registerHRModels(tenantConnection);
        } catch (modelError) {
            console.error(`❌ Error registering models for tenant ${tenantId}:`, modelError.message);
            return res.status(500).json({
                success: false,
                message: 'Database model registration error',
                error: process.env.NODE_ENV === 'development' ? modelError.message : undefined
            });
        }

        const position = await models.Position.findOneAndDelete({ 
            _id: req.params.id, 
            tenantId: tenantId 
        });
        
        if (!position) {
            return res.status(404).json({ 
                success: false,
                message: 'Position not found' 
            });
        }
        
        res.json({
            success: true,
            message: 'Position deleted successfully'
        });
    } catch (err) {
        console.error('❌ Error deleting position:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
