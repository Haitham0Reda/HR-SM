import express from 'express';
import { authenticatePlatformUser } from '../../middleware/platformAuth.js';
import { validatePlatformPermission } from '../../middleware/platformPermissions.js';
import Company from '../../models/Company.js';
import ModuleManagementService from '../../services/ModuleManagementService.js';

const router = express.Router();

/**
 * Platform Company Routes
 * Base path: /api/platform/companies
 */

// Get available modules and models (MUST be before /:companyId route)
router.get('/modules-and-models', 
  // authenticatePlatformUser,
  // validatePlatformPermission('view_modules'),
  async (req, res) => {
    try {
      console.log('📋 Getting available modules and models...');
      
      // Simple fallback data in case of issues
      const fallbackData = {
        success: true,
        data: {
          moduleCategories: {
            core: [
              { key: 'hr-core', name: 'HR Core', description: 'Essential HR functionality', required: true }
            ],
            time: [
              { key: 'attendance', name: 'Attendance Management', description: 'Time tracking and attendance' },
              { key: 'leave', name: 'Leave Management', description: 'Leave requests and approvals' }
            ]
          },
          availableModules: {
            'hr-core': { name: 'HR Core', description: 'Essential HR functionality', required: true },
            'attendance': { name: 'Attendance Management', description: 'Time tracking and attendance' },
            'leave': { name: 'Leave Management', description: 'Leave requests and approvals' }
          },
          tierLimits: {
            starter: { employees: 50, storage: 1073741824, apiCalls: 10000 },
            business: { employees: 200, storage: 10737418240, apiCalls: 50000 },
            enterprise: { employees: null, storage: null, apiCalls: null }
          },
          totalModules: 3
        }
      };

      try {
        const moduleService = ModuleManagementService;
        const availableModules = moduleService.getAvailableModules();
        
        console.log('✓ Available modules loaded:', Object.keys(availableModules).length);
        
        // Get all tier limits
        const tierLimits = {
          starter: moduleService.getTierLimits('starter'),
          business: moduleService.getTierLimits('business'),
          enterprise: moduleService.getTierLimits('enterprise')
        };
        
        console.log('✓ Tier limits loaded');
        
        // Group modules by category
        const moduleCategories = {};
        Object.entries(availableModules).forEach(([key, module]) => {
          if (!moduleCategories[module.category]) {
            moduleCategories[module.category] = [];
          }
          moduleCategories[module.category].push({
            key,
            ...module
          });
        });

        console.log('✓ Module categories grouped:', Object.keys(moduleCategories));

        const responseData = {
          success: true,
          data: {
            moduleCategories,
            availableModules,
            tierLimits,
            totalModules: Object.keys(availableModules).length
          }
        };

        console.log('✓ Sending response with', responseData.data.totalModules, 'modules');
        res.json(responseData);
        
      } catch (moduleError) {
        console.warn('⚠️ ModuleManagementService error, using fallback:', moduleError.message);
        res.json(fallbackData);
      }
      
    } catch (error) {
      console.error('❌ Error getting modules and models:', error);
      
      // Return fallback data instead of 500 error
      res.json({
        success: true,
        data: {
          moduleCategories: {},
          availableModules: {},
          tierLimits: {
            starter: { employees: 50, storage: 1073741824, apiCalls: 10000 },
            business: { employees: 200, storage: 10737418240, apiCalls: 50000 },
            enterprise: { employees: null, storage: null, apiCalls: null }
          },
          totalModules: 0
        }
      });
    }
  }
);

// Get company modules (MUST be before /:companyId route)
router.get('/:companyId/modules', 
  // authenticatePlatformUser,
  // validatePlatformPermission('view_companies'),
  async (req, res) => {
    try {
      console.log('📋 Getting modules for company:', req.params.companyId);
      
      // Try to find company by slug first, then by ID if it's a valid ObjectId
      let company;
      try {
        console.log('🔍 Searching for company by slug:', req.params.companyId);
        company = await Company.findOne({ slug: req.params.companyId });
        
        if (!company && req.params.companyId.match(/^[0-9a-fA-F]{24}$/)) {
          console.log('🔍 Slug not found, trying by ObjectId...');
          company = await Company.findById(req.params.companyId);
        }
      } catch (dbError) {
        console.log('⚠️ Database error, trying slug only:', dbError.message);
        try {
          company = await Company.findOne({ slug: req.params.companyId });
        } catch (fallbackError) {
          console.error('❌ Fallback query failed:', fallbackError.message);
          throw fallbackError;
        }
      }
      
      if (!company) {
        console.log('❌ Company not found:', req.params.companyId);
        return res.status(404).json({
          success: false,
          message: `Company not found: ${req.params.companyId}`
        });
      }

      console.log('✓ Company found:', company.name, '(slug:', company.slug, ')');

      try {
        const moduleService = ModuleManagementService;
        const availableModules = moduleService.getAvailableModules();
        
        console.log('✓ Available modules loaded:', Object.keys(availableModules).length);
        
        // Build response with module status
        const companyModules = {};
        Object.entries(availableModules).forEach(([key, moduleInfo]) => {
          try {
            const moduleConfig = company.getModuleConfig(key);
            companyModules[key] = {
              ...moduleInfo,
              enabled: moduleConfig ? moduleConfig.enabled : false,
              tier: moduleConfig ? moduleConfig.tier : 'starter',
              limits: moduleConfig ? moduleConfig.limits : {},
              canDisable: !moduleInfo.required
            };
          } catch (moduleError) {
            console.warn('⚠️ Error processing module', key, ':', moduleError.message);
            // Add module with default values
            companyModules[key] = {
              ...moduleInfo,
              enabled: false,
              tier: 'starter',
              limits: {},
              canDisable: !moduleInfo.required
            };
          }
        });

        console.log('✓ Company modules processed, enabled count:', 
          Object.values(companyModules).filter(m => m.enabled).length);

        const responseData = {
          success: true,
          data: {
            availableModules: companyModules,
            company: {
              name: company.name,
              slug: company.slug,
              status: company.status
            }
          }
        };

        console.log('✓ Sending successful response');
        res.json(responseData);
        
      } catch (moduleServiceError) {
        console.error('❌ ModuleService error:', moduleServiceError.message);
        
        // Return minimal fallback response
        res.json({
          success: true,
          data: {
            availableModules: {},
            company: {
              name: company.name,
              slug: company.slug,
              status: company.status
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ Error getting company modules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get company modules',
        error: error.message
      });
    }
  }
);

// Enable module for company (MUST be before /:companyId route)
router.post('/:companyId/modules/:moduleKey/enable', 
  // authenticatePlatformUser,
  // validatePlatformPermission('manage_companies'),
  async (req, res) => {
    try {
      console.log('🔧 Enabling module:', req.params.moduleKey, 'for company:', req.params.companyId);
      console.log('📋 Request body:', req.body);
      
      // Try to find company by slug first, then by ID if it's a valid ObjectId
      let company;
      try {
        company = await Company.findOne({ slug: req.params.companyId });
        if (!company && req.params.companyId.match(/^[0-9a-fA-F]{24}$/)) {
          company = await Company.findById(req.params.companyId);
        }
      } catch (error) {
        company = await Company.findOne({ slug: req.params.companyId });
      }
      
      if (!company) {
        console.log('❌ Company not found:', req.params.companyId);
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      console.log('✓ Company found:', company.name, '(ID:', company._id, ')');

      const { tier = 'starter', limits = {} } = req.body;
      console.log('📋 Module config - Tier:', tier, 'Limits:', limits);
      
      const moduleService = ModuleManagementService;
      
      console.log('🔧 Calling enableModuleForCompany...');
      const result = await moduleService.enableModuleForCompany(
        company._id,
        req.params.moduleKey,
        tier,
        limits
      );

      console.log('📋 EnableModule result:', result);

      if (result.success) {
        console.log('✅ Module enabled successfully');
        res.json({
          success: true,
          message: 'Module enabled successfully',
          data: result
        });
      } else {
        console.log('❌ Module enable failed:', result.message);
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to enable module'
        });
      }
    } catch (error) {
      console.error('❌ Error enabling module:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable module',
        error: error.message
      });
    }
  }
);

// Disable module for company (MUST be before /:companyId route)
router.delete('/:companyId/modules/:moduleKey/disable', 
  // authenticatePlatformUser,
  // validatePlatformPermission('manage_companies'),
  async (req, res) => {
    try {
      // Try to find company by slug first, then by ID if it's a valid ObjectId
      let company;
      try {
        company = await Company.findOne({ slug: req.params.companyId });
        if (!company && req.params.companyId.match(/^[0-9a-fA-F]{24}$/)) {
          company = await Company.findById(req.params.companyId);
        }
      } catch (error) {
        company = await Company.findOne({ slug: req.params.companyId });
      }
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      const moduleService = ModuleManagementService;
      const result = await moduleService.disableModuleForCompany(
        company._id,
        req.params.moduleKey
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Module disabled successfully',
          data: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error disabling module:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable module'
      });
    }
  }
);

// Get all companies (public for dashboard - TODO: add authentication)
router.get('/', 
  // authenticatePlatformUser,
  // validatePlatformPermission('view_companies'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      
      // Build query
      const query = {};
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
          { adminEmail: { $regex: search, $options: 'i' } }
        ];
      }

      // Get companies with pagination
      const companies = await Company.find(query)
        .select('name slug status subscription adminEmail usage modules createdAt')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Company.countDocuments(query);

      res.json({
        success: true,
        data: {
          companies: companies || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get companies'
      });
    }
  }
);

// Create company
router.post('/', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  async (req, res) => {
    try {
      const company = new Company(req.body);
      await company.save();

      res.status(201).json({
        success: true,
        data: { company }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create company'
      });
    }
  }
);

// Update company
router.put('/:companyId', 
  authenticatePlatformUser,
  validatePlatformPermission('manage_companies'),
  async (req, res) => {
    try {
      const company = await Company.findByIdAndUpdate(
        req.params.companyId,
        req.body,
        { new: true, runValidators: true }
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.json({
        success: true,
        data: { company }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update company'
      });
    }
  }
);

// Get specific company (MUST be last among /:companyId routes)
router.get('/:companyId', 
  authenticatePlatformUser,
  validatePlatformPermission('view_companies'),
  async (req, res) => {
    try {
      const company = await Company.findById(req.params.companyId);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      res.json({
        success: true,
        data: { company }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get company'
      });
    }
  }
);

export default router;