/**
 * Platform Companies Module
 * 
 * Exports all company management functionality for the platform
 */

import companyRoutes from './routes/companyRoutes.js';
import companyController from './controllers/companyController.js';
import companyService from './services/companyService.js';

export {
    companyRoutes,
    companyController,
    companyService
};

export default {
    routes: companyRoutes,
    controller: companyController,
    service: companyService
};