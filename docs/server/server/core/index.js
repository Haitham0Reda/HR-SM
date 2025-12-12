/**
 * Core Infrastructure Module
 * 
 * Central entry point for all core infrastructure components
 * Provides authentication, errors, logging, config, middleware, and registry
 */

export * from './auth/index.js';
export * from './errors/index.js';
export * from './logging/index.js';
export * from './config/index.js';
export * from './middleware/index.js';
export * from './registry/index.js';

export default {
    auth: await import('./auth/index.js'),
    errors: await import('./errors/index.js'),
    logging: await import('./logging/index.js'),
    config: await import('./config/index.js'),
    middleware: await import('./middleware/index.js'),
    registry: await import('./registry/index.js')
};
