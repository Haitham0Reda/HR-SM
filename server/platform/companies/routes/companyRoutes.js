/**
 * Platform Company Management Routes
 * 
 * Routes for managing multi-tenant companies from the platform interface
 */

import express from 'express';
import companyController from '../controllers/companyController.js';

const router = express.Router();

// Get all companies with metadata and statistics
router.get('/', companyController.getAllCompanies);

// Get available modules and models
router.get('/modules-and-models', companyController.getAvailableModulesAndModels);

// Get detailed information about a specific company
router.get('/:companyName', companyController.getCompanyDetails);

// Create a new company
router.post('/', companyController.createCompany);

// Update company metadata
router.patch('/:companyName', companyController.updateCompany);

// Delete/Archive a company
router.delete('/:companyName', companyController.deleteCompany);

// Module management for companies
router.get('/:companyName/modules', companyController.getCompanyModules);
router.patch('/:companyName/modules', companyController.updateCompanyModules);
router.post('/:companyName/modules/:moduleName/enable', companyController.enableModule);
router.delete('/:companyName/modules/:moduleName/disable', companyController.disableModule);

export default router;