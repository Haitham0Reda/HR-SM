/**
 * Tasks Module Configuration
 * 
 * This module provides task management functionality.
 * It depends on HR-Core for user and department data.
 * It optionally integrates with Email Service for task notifications.
 */

export default {
  // Module identification
  name: 'tasks',
  displayName: 'Task Management',
  version: '1.0.0',
  description: 'Task management system with assignments, tracking, and reporting capabilities',
  author: 'System',
  category: 'productivity',
  
  // Module dependencies
  // Tasks module requires HR-Core for user and department data
  dependencies: ['hr-core'],
  
  // Optional dependencies
  // Tasks module can use Email Service for notifications if available
  optionalDependencies: ['email-service'],
  
  // Modules that can use this module
  // Tasks module doesn't provide services to other modules
  providesTo: [],
  
  // Pricing information
  pricing: {
    tier: 'professional',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    currency: 'USD',
    description: 'Includes task management, assignments, tracking, and reporting'
  },
  
  // Feature flags
  features: {
    taskCreation: true,
    taskAssignment: true,
    taskTracking: true,
    taskReports: true,
    taskAnalytics: true,
    emailNotifications: true,
    taskComments: true,
    taskAttachments: true
  },
  
  // API routes configuration
  routes: {
    base: '/api/v1/tasks',
    endpoints: [
      {
        path: '/tasks',
        method: 'POST',
        auth: true,
        roles: ['Manager', 'HR', 'Admin'],
        description: 'Create a new task'
      },
      {
        path: '/tasks',
        method: 'GET',
        auth: true,
        description: 'Get all tasks for authenticated user'
      },
      {
        path: '/tasks/analytics',
        method: 'GET',
        auth: true,
        description: 'Get task analytics'
      },
      {
        path: '/tasks/:id',
        method: 'GET',
        auth: true,
        description: 'Get task by ID'
      },
      {
        path: '/tasks/:id',
        method: 'PUT',
        auth: true,
        roles: ['Manager', 'HR', 'Admin'],
        description: 'Update task'
      },
      {
        path: '/tasks/:id/status',
        method: 'PATCH',
        auth: true,
        description: 'Update task status'
      },
      {
        path: '/tasks/:id',
        method: 'DELETE',
        auth: true,
        roles: ['Manager', 'HR', 'Admin'],
        description: 'Delete task'
      },
      {
        path: '/task-reports',
        method: 'POST',
        auth: true,
        description: 'Submit task report'
      },
      {
        path: '/task-reports',
        method: 'GET',
        auth: true,
        description: 'Get task reports'
      },
      {
        path: '/task-reports/:id',
        method: 'GET',
        auth: true,
        description: 'Get task report by ID'
      },
      {
        path: '/task-reports/:id',
        method: 'PUT',
        auth: true,
        description: 'Update task report'
      },
      {
        path: '/task-reports/:id',
        method: 'DELETE',
        auth: true,
        roles: ['Manager', 'HR', 'Admin'],
        description: 'Delete task report'
      }
    ]
  },
  
  // Database models
  models: ['Task', 'TaskReport'],
  
  // Configuration schema
  configSchema: {
    emailNotifications: {
      type: 'boolean',
      default: true,
      description: 'Enable email notifications for task assignments'
    },
    defaultTaskPriority: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      description: 'Default priority for new tasks'
    },
    autoAssignTasks: {
      type: 'boolean',
      default: false,
      description: 'Automatically assign tasks based on department'
    },
    taskReportRequired: {
      type: 'boolean',
      default: true,
      description: 'Require task reports for completed tasks'
    }
  },
  
  /**
   * Initialize tasks module
   * @param {Object} app - Express app instance
   * @param {string} tenantId - Tenant identifier
   * @param {Object} config - Module configuration
   */
  async initialize(app, tenantId, config) {
    console.log(`[Tasks Module] Initializing for tenant: ${tenantId}`);
    
    // Check if email-service is available
    const emailServiceAvailable = config?.enabledModules?.includes('email-service');
    
    if (emailServiceAvailable) {
      console.log(`[Tasks Module] Email service is available for tenant: ${tenantId}`);
    } else {
      console.log(`[Tasks Module] Email service not available, notifications will be logged only`);
    }
    
    return {
      success: true,
      message: 'Tasks module initialized successfully',
      emailServiceAvailable
    };
  },
  
  /**
   * Cleanup tasks module
   * @param {string} tenantId - Tenant identifier
   */
  async cleanup(tenantId) {
    console.log(`[Tasks Module] Cleanup for tenant: ${tenantId}`);
    
    // Task data is preserved in the database
    // No specific cleanup needed
    
    return {
      success: true,
      message: 'Tasks module cleanup completed'
    };
  },
  
  /**
   * Health check for tasks module
   * @param {string} tenantId - Tenant identifier
   */
  async healthCheck(tenantId) {
    // Check if tasks module is functioning correctly
    try {
      // Could check database connectivity, etc.
      return {
        healthy: true,
        details: {
          enabled: true,
          tenantId
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
};
