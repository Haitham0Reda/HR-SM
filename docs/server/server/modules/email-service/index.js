/**
 * Email Service Module Entry Point
 * 
 * This module provides email functionality to other modules.
 * It can be imported and used by any module that needs email capabilities.
 */

import emailService from './services/emailService.js';
import emailRoutes from './routes/emailRoutes.js';
import moduleConfig from './module.config.js';

export {
  emailService,
  emailRoutes,
  moduleConfig
};

export default emailService;
