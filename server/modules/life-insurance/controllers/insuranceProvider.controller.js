import InsuranceProviderModel from '../models/InsuranceProvider.js';
import { validationResult } from 'express-validator';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import multiTenantDB from '../../../config/multiTenant.js';

/**
 * Insurance Provider Controller
 * Handles CRUD operations for insurance providers
 */

/**
 * Get InsuranceProvider model for tenant-specific database
 */
const getInsuranceProviderModel = async (tenantId) => {
    const connection = await multiTenantDB.getCompanyConnection(tenantId);
    
    // Check if model is already registered
    if (connection.models.InsuranceProvider) {
        return connection.models.InsuranceProvider;
    }
    
    // Register the model on the tenant connection
    return connection.model('InsuranceProvider', InsuranceProviderModel.schema);
};

// Get all insurance providers
export const getInsuranceProviders = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status, 
            insuranceType, 
            search,
            sort = 'name'
        } = req.query;

        const tenantId = req.user.tenantId;
        
        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);
        
        // Build query
        const query = { tenantId };
        
        if (status) {
            query.status = status;
        }
        
        if (insuranceType) {
            query.insuranceTypes = { $in: [insuranceType] };
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { nameArabic: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { 'contactInfo.email': { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [providers, total] = await Promise.all([
            InsuranceProvider.find(query)
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            InsuranceProvider.countDocuments(query)
        ]);

        const response = {
            providers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        };

        return sendSuccess(res, response, 'Insurance providers retrieved successfully');
    } catch (error) {
        console.error('Error fetching insurance providers:', error);
        return sendError(res, 'Failed to fetch insurance providers', 500);
    }
};

// Get single insurance provider
export const getInsuranceProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);

        const provider = await InsuranceProvider.findOne({ _id: id, tenantId })
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!provider) {
            return sendError(res, 'Insurance provider not found', 404);
        }

        return sendSuccess(res, provider, 'Insurance provider retrieved successfully');
    } catch (error) {
        console.error('Error fetching insurance provider:', error);
        return sendError(res, 'Failed to fetch insurance provider', 500);
    }
};

// Create new insurance provider
export const createInsuranceProvider = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendError(res, 'Validation failed', 400, errors.array());
        }

        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);

        // Check if provider with same code already exists
        const existingProvider = await InsuranceProvider.findOne({
            tenantId,
            code: req.body.code.toUpperCase()
        });

        if (existingProvider) {
            return sendError(res, 'Provider with this code already exists', 400);
        }

        // Create new provider
        const providerData = {
            ...req.body,
            tenantId,
            createdBy: userId,
            code: req.body.code.toUpperCase()
        };

        // Add creation history
        providerData.history = [{
            action: 'created',
            performedBy: userId,
            timestamp: new Date(),
            notes: 'Provider created'
        }];

        const provider = new InsuranceProvider(providerData);
        await provider.save();

        // Populate the response
        await provider.populate('createdBy', 'firstName lastName email');

        return sendSuccess(res, provider, 'Insurance provider created successfully', 201);
    } catch (error) {
        console.error('Error creating insurance provider:', error);
        
        if (error.code === 11000) {
            return sendError(res, 'Provider with this code already exists', 400);
        }
        
        return sendError(res, 'Failed to create insurance provider', 500);
    }
};

// Update insurance provider
export const updateInsuranceProvider = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendError(res, 'Validation failed', 400, errors.array());
        }

        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);

        // Find the provider
        const provider = await InsuranceProvider.findOne({ _id: id, tenantId });
        if (!provider) {
            return sendError(res, 'Insurance provider not found', 404);
        }

        // Check if code is being changed and if it conflicts
        if (req.body.code && req.body.code.toUpperCase() !== provider.code) {
            const existingProvider = await InsuranceProvider.findOne({
                tenantId,
                code: req.body.code.toUpperCase(),
                _id: { $ne: id }
            });

            if (existingProvider) {
                return sendError(res, 'Provider with this code already exists', 400);
            }
        }

        // Update provider
        Object.assign(provider, req.body);
        provider.updatedBy = userId;
        
        if (req.body.code) {
            provider.code = req.body.code.toUpperCase();
        }

        await provider.save();

        // Populate the response
        await provider.populate('createdBy', 'firstName lastName email');
        await provider.populate('updatedBy', 'firstName lastName email');

        return sendSuccess(res, provider, 'Insurance provider updated successfully');
    } catch (error) {
        console.error('Error updating insurance provider:', error);
        
        if (error.code === 11000) {
            return sendError(res, 'Provider with this code already exists', 400);
        }
        
        return sendError(res, 'Failed to update insurance provider', 500);
    }
};

// Delete insurance provider
export const deleteInsuranceProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);

        const provider = await InsuranceProvider.findOne({ _id: id, tenantId });
        if (!provider) {
            return sendError(res, 'Insurance provider not found', 404);
        }

        // Check if provider has active policies
        const { default: InsurancePolicyModel } = await import('../models/InsurancePolicy.js');
        const connection = await multiTenantDB.getCompanyConnection(tenantId);
        const InsurancePolicy = connection.model('InsurancePolicy', InsurancePolicyModel.schema);
        
        const activePolicies = await InsurancePolicy.countDocuments({
            tenantId,
            providerId: id,
            status: 'active'
        });

        if (activePolicies > 0) {
            return sendError(res, 
                `Cannot delete provider. It has ${activePolicies} active policies. Please deactivate or transfer the policies first.`,
                400
            );
        }

        await InsuranceProvider.findByIdAndDelete(id);

        return sendSuccess(res, null, 'Insurance provider deleted successfully');
    } catch (error) {
        console.error('Error deleting insurance provider:', error);
        return sendError(res, 'Failed to delete insurance provider', 500);
    }
};

// Activate insurance provider
export const activateInsuranceProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);

        const provider = await InsuranceProvider.findOne({ _id: id, tenantId });
        if (!provider) {
            return sendError(res, 'Insurance provider not found', 404);
        }

        await provider.activate(userId);
        await provider.populate('updatedBy', 'firstName lastName email');

        return sendSuccess(res, provider, 'Insurance provider activated successfully');
    } catch (error) {
        console.error('Error activating insurance provider:', error);
        return sendError(res, 'Failed to activate insurance provider', 500);
    }
};

// Deactivate insurance provider
export const deactivateInsuranceProvider = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);

        const provider = await InsuranceProvider.findOne({ _id: id, tenantId });
        if (!provider) {
            return sendError(res, 'Insurance provider not found', 404);
        }

        await provider.deactivate(userId, reason);
        await provider.populate('updatedBy', 'firstName lastName email');

        return sendSuccess(res, provider, 'Insurance provider deactivated successfully');
    } catch (error) {
        console.error('Error deactivating insurance provider:', error);
        return sendError(res, 'Failed to deactivate insurance provider', 500);
    }
};

// Get provider statistics
export const getProviderStatistics = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // Get tenant-specific InsuranceProvider model
        const InsuranceProvider = await getInsuranceProviderModel(tenantId);

        const stats = await InsuranceProvider.aggregate([
            { $match: { tenantId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
                    suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
                    averageRating: { $avg: '$rating' }
                }
            }
        ]);

        const result = stats[0] || {
            total: 0,
            active: 0,
            inactive: 0,
            suspended: 0,
            averageRating: 0
        };

        return sendSuccess(res, result, 'Provider statistics retrieved successfully');
    } catch (error) {
        console.error('Error fetching provider statistics:', error);
        return sendError(res, 'Failed to fetch provider statistics', 500);
    }
};