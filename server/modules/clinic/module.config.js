/**
 * Clinic Module Configuration
 * 
 * This module provides medical clinic management functionality.
 * 
 * 🚨 CRITICAL RULE: Clinic Can Only REQUEST Changes via HR-Core
 * 
 * The Clinic module CANNOT directly modify:
 * - Attendance records
 * - Vacation balances
 * - Overtime records
 * - Any employment data
 * 
 * Instead, Clinic creates medical leave REQUESTS via HR-Core Requests API.
 * HR-Core approves/rejects and updates balances.
 * Clinic only reads request status.
 */

export default {
  // Module identification
  name: 'clinic',
  displayName: 'Medical Clinic',
  version: '1.0.0',
  description: 'Medical clinic management system with medical profiles, visits, appointments, prescriptions, and medical leave integration',
  author: 'System',
  category: 'healthcare',
  
  // Module dependencies
  // Clinic requires HR-Core for user data and request system
  dependencies: ['hr-core'],
  
  // Optional dependencies
  // Clinic can use Email Service for notifications if available
  optionalDependencies: ['email-service'],
  
  // Modules that can use this module
  // Clinic doesn't provide services to other modules
  providesTo: [],
  
  // Pricing information
  pricing: {
    tier: 'enterprise',
    monthlyPrice: 49.99,
    yearlyPrice: 499.99,
    currency: 'USD',
    description: 'Includes medical profiles, visits, appointments, prescriptions, and medical leave integration'
  },
  
  // Feature flags
  features: {
    medicalProfiles: true,
    visits: true,
    appointments: true,
    prescriptions: true,
    medicalLeaveRequests: true,
    emailNotifications: true,
    appointmentReminders: true,
    prescriptionRefillReminders: true,
    labTests: true,
    emergencyContacts: true,
    insuranceManagement: true
  },
  
  // API routes configuration
  routes: {
    base: '/api/v1/clinic',
    endpoints: [
      // Medical Profiles
      {
        path: '/medical-profiles',
        method: 'POST',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Create medical profile'
      },
      {
        path: '/medical-profiles',
        method: 'GET',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Get all medical profiles'
      },
      {
        path: '/medical-profiles/user/:userId',
        method: 'GET',
        auth: true,
        description: 'Get medical profile by user ID'
      },
      {
        path: '/medical-profiles/:id',
        method: 'GET',
        auth: true,
        description: 'Get medical profile by ID'
      },
      {
        path: '/medical-profiles/:id',
        method: 'PUT',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Update medical profile'
      },
      {
        path: '/medical-profiles/:id',
        method: 'DELETE',
        auth: true,
        roles: ['Admin'],
        description: 'Delete medical profile'
      },
      
      // Visits
      {
        path: '/visits',
        method: 'POST',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Create visit record'
      },
      {
        path: '/visits',
        method: 'GET',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Get visits'
      },
      {
        path: '/visits/:id',
        method: 'GET',
        auth: true,
        description: 'Get visit by ID'
      },
      {
        path: '/visits/:id',
        method: 'PUT',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Update visit'
      },
      {
        path: '/visits/:id',
        method: 'DELETE',
        auth: true,
        roles: ['Admin'],
        description: 'Delete visit'
      },
      
      // Appointments
      {
        path: '/appointments',
        method: 'POST',
        auth: true,
        description: 'Schedule appointment'
      },
      {
        path: '/appointments',
        method: 'GET',
        auth: true,
        description: 'Get appointments'
      },
      
      // Prescriptions
      {
        path: '/prescriptions',
        method: 'POST',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Create prescription'
      },
      {
        path: '/prescriptions',
        method: 'GET',
        auth: true,
        description: 'Get prescriptions'
      },
      {
        path: '/prescriptions/:id',
        method: 'GET',
        auth: true,
        description: 'Get prescription by ID'
      },
      {
        path: '/prescriptions/:id',
        method: 'PUT',
        auth: true,
        roles: ['Admin', 'HR', 'medical-staff'],
        description: 'Update prescription'
      },
      {
        path: '/prescriptions/:id',
        method: 'DELETE',
        auth: true,
        roles: ['Admin'],
        description: 'Delete prescription'
      },
      
      // Medical Leave Requests (via HR-Core)
      {
        path: '/medical-leave-request',
        method: 'POST',
        auth: true,
        description: 'Create medical leave request (calls HR-Core)'
      },
      {
        path: '/medical-leave-requests',
        method: 'GET',
        auth: true,
        description: 'Get medical leave requests'
      },
      {
        path: '/medical-leave-requests/:id',
        method: 'GET',
        auth: true,
        description: 'Get medical leave request status'
      }
    ]
  },
  
  // Database models
  models: ['MedicalProfile', 'Visit', 'Appointment', 'Prescription'],
  
  // Configuration schema
  configSchema: {
    emailNotifications: {
      type: 'boolean',
      default: true,
      description: 'Enable email notifications for appointments and prescriptions'
    },
    appointmentReminderHours: {
      type: 'number',
      default: 24,
      description: 'Hours before appointment to send reminder'
    },
    prescriptionRefillDays: {
      type: 'number',
      default: 7,
      description: 'Days before prescription expiry to send refill reminder'
    },
    requireMedicalDocumentation: {
      type: 'boolean',
      default: true,
      description: 'Require medical documentation for medical leave requests'
    },
    allowSelfScheduling: {
      type: 'boolean',
      default: true,
      description: 'Allow employees to schedule their own appointments'
    }
  },
  
  // Module metadata
  metadata: {
    required: false,
    canBeDisabled: true,
    isCore: false,
    supportsMultiTenant: true,
    requiresTenantContext: true,
    
    // 🚨 CRITICAL ARCHITECTURAL RULES
    architecturalRules: {
      canRequestChanges: true,
      canModifyHRCoreData: false,
      mustUseHRCoreRequests: true,
      description: 'Clinic can only REQUEST changes through HR-Core. It CANNOT directly modify attendance, vacation balances, or any employment data.'
    }
  },
  
  /**
   * Initialize clinic module
   * @param {Object} app - Express app instance
   * @param {string} tenantId - Tenant identifier
   * @param {Object} config - Module configuration
   */
  async initialize(app, tenantId, config) {
    console.log(`[Clinic Module] Initializing for tenant: ${tenantId}`);
    
    // Check if email-service is available
    const emailServiceAvailable = config?.enabledModules?.includes('email-service');
    
    if (emailServiceAvailable) {
      console.log(`[Clinic Module] Email service is available for tenant: ${tenantId}`);
      console.log(`[Clinic Module] Appointment reminders and prescription notifications will be sent via email`);
    } else {
      console.log(`[Clinic Module] Email service not available, notifications will be logged only`);
    }
    
    // Verify HR-Core dependency
    const hrCoreAvailable = config?.enabledModules?.includes('hr-core');
    if (!hrCoreAvailable) {
      throw new Error('Clinic module requires HR-Core to be enabled');
    }
    
    console.log(`[Clinic Module] ✅ HR-Core dependency satisfied`);
    console.log(`[Clinic Module] 🚨 REMINDER: Clinic can only REQUEST changes via HR-Core, never directly modify data`);
    
    return {
      success: true,
      message: 'Clinic module initialized successfully',
      emailServiceAvailable,
      hrCoreAvailable
    };
  },
  
  /**
   * Cleanup clinic module
   * @param {string} tenantId - Tenant identifier
   */
  async cleanup(tenantId) {
    console.log(`[Clinic Module] Cleanup for tenant: ${tenantId}`);
    
    // Clinic data is preserved in the database
    // No specific cleanup needed
    
    return {
      success: true,
      message: 'Clinic module cleanup completed'
    };
  },
  
  /**
   * Health check for clinic module
   * @param {string} tenantId - Tenant identifier
   */
  async healthCheck(tenantId) {
    try {
      // Check if clinic module is functioning correctly
      // Could check database connectivity, HR-Core availability, etc.
      
      return {
        healthy: true,
        details: {
          enabled: true,
          tenantId,
          hrCoreAvailable: true,
          emailServiceAvailable: false  // Would check actual status
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  },
  
  /**
   * Get module documentation
   */
  getDocumentation() {
    return {
      overview: 'Medical clinic management system for organizations with on-site medical facilities',
      
      criticalRules: [
        '🚨 Clinic CANNOT directly modify attendance records',
        '🚨 Clinic CANNOT directly modify vacation balances',
        '🚨 Clinic CANNOT directly modify overtime records',
        '✅ Clinic creates medical leave REQUESTS via HR-Core',
        '✅ HR-Core approves/rejects and updates balances',
        '✅ Clinic only reads request status'
      ],
      
      features: [
        'Medical profiles with allergies, conditions, medications',
        'Visit records with diagnosis and treatment',
        'Appointment scheduling with reminders',
        'Prescription management with refill tracking',
        'Medical leave requests via HR-Core integration'
      ],
      
      dependencies: {
        required: ['hr-core'],
        optional: ['email-service']
      },
      
      integration: {
        hrCore: 'Creates medical leave requests via HR-Core Requests API',
        emailService: 'Sends appointment reminders and prescription notifications if enabled'
      }
    };
  }
};
