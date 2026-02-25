/**
 * Legacy Dashboard Routes
 * 
 * DEPRECATED: This file is kept for backward compatibility only.
 * The actual dashboard routes are now in server/modules/dashboard/routes/dashboard.routes.js
 * and are loaded through the modular system.
 * 
 * This file now re-exports the modular dashboard routes to avoid conflicts.
 */

// Re-export the modular dashboard routes
export { default } from '../modules/dashboard/routes/dashboard.routes.js';