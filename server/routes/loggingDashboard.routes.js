/**
 * Logging Dashboard Routes
 * 
 * Defines REST API endpoints for logging system monitoring dashboard
 */

import express from 'express';
import loggingDashboardController from '../controllers/loggingDashboard.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { setupCompanyLogging } from '../middleware/companyLogging.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply company logging middleware
router.use(setupCompanyLogging);

// Dashboard overview
router.get('/dashboard', loggingDashboardController.getDashboardOverview);

// Monitoring control
router.get('/dashboard/monitoring', loggingDashboardController.getMonitoringStatus);
router.post('/dashboard/monitoring/start', loggingDashboardController.startMonitoring);
router.post('/dashboard/monitoring/stop', loggingDashboardController.stopMonitoring);
router.put('/dashboard/monitoring/thresholds', loggingDashboardController.updateThresholds);

// System health
router.get('/dashboard/health', loggingDashboardController.getSystemHealth);

// Statistics
router.get('/dashboard/statistics', loggingDashboardController.getLogStatistics);

// Alerts
router.get('/dashboard/alerts', loggingDashboardController.getRecentAlerts);
router.get('/dashboard/alerts/statistics', loggingDashboardController.getAlertStatistics);

// Maintenance
router.get('/dashboard/maintenance', loggingDashboardController.getMaintenanceStatus);
router.post('/dashboard/maintenance/run', loggingDashboardController.runMaintenance);

// Performance metrics
router.get('/dashboard/performance', loggingDashboardController.getPerformanceMetrics);

// Real-time data
router.get('/dashboard/realtime', loggingDashboardController.getRealtimeMetrics);

// Export
router.get('/dashboard/export', loggingDashboardController.exportDashboardData);

export default router;