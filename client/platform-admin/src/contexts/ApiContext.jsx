import React, { createContext, useContext, useState, useEffect } from 'react';
import { platformService } from '../services/platformApi';
import { licenseService } from '../services/licenseApi';
import realtimeService from '../services/realtimeService';

const ApiContext = createContext();

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export const ApiProvider = ({ children }) => {
  const [platformStatus, setPlatformStatus] = useState({
    connected: false,
    error: null,
    lastCheck: null
  });
  
  const [licenseServerStatus, setLicenseServerStatus] = useState({
    connected: false,
    error: null,
    lastCheck: null
  });

  const [realtimeStatus, setRealtimeStatus] = useState({
    connected: false,
    error: null
  });

  // Check platform API health
  const checkPlatformHealth = async () => {
    try {
      await platformService.getSystemHealth();
      setPlatformStatus({
        connected: true,
        error: null,
        lastCheck: new Date()
      });
    } catch (error) {
      setPlatformStatus({
        connected: false,
        error: error.message,
        lastCheck: new Date()
      });
    }
  };

  // Check license server health
  const checkLicenseServerHealth = async () => {
    try {
      await licenseService.healthCheck();
      setLicenseServerStatus({
        connected: true,
        error: null,
        lastCheck: new Date()
      });
    } catch (error) {
      setLicenseServerStatus({
        connected: false,
        error: error.message,
        lastCheck: new Date()
      });
    }
  };

  // Initialize connections and health checks
  useEffect(() => {
    // Initial health checks
    checkPlatformHealth();
    checkLicenseServerHealth();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      checkPlatformHealth();
      checkLicenseServerHealth();
    }, 30000); // Check every 30 seconds

    // Initialize real-time connection
    realtimeService.connect();

    // Subscribe to real-time connection status
    const unsubscribeRealtime = realtimeService.subscribe('connection', (status) => {
      setRealtimeStatus({
        connected: status.connected,
        error: status.error || null
      });
    });

    return () => {
      clearInterval(healthCheckInterval);
      unsubscribeRealtime();
    };
  }, []);

  // API wrapper functions with error handling
  const apiWrapper = {
    // Platform API methods
    platform: {
      async getTenant(tenantId) {
        try {
          return await platformService.getTenant(tenantId);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getTenants() {
        try {
          return await platformService.getTenants();
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async createTenant(tenantData) {
        try {
          return await platformService.createTenant(tenantData);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getTenantMetrics(tenantId) {
        try {
          return await platformService.getTenantMetrics(tenantId);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getSystemMetrics() {
        try {
          return await platformService.getSystemMetrics();
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async enableModule(tenantId, moduleId) {
        try {
          return await platformService.enableModule(tenantId, moduleId);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async disableModule(tenantId, moduleId) {
        try {
          return await platformService.disableModule(tenantId, moduleId);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getRevenueAnalytics(dateRange) {
        try {
          return await platformService.getRevenueAnalytics(dateRange);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getUsageAnalytics(dateRange) {
        try {
          return await platformService.getUsageAnalytics(dateRange);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getPerformanceMetrics(dateRange) {
        try {
          return await platformService.getPerformanceMetrics(dateRange);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getAuditLogs(filters) {
        try {
          return await platformService.getAuditLogs(filters);
        } catch (error) {
          setPlatformStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      }
    },

    // License API methods
    license: {
      async createLicense(licenseData) {
        try {
          return await licenseService.createLicense(licenseData);
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getLicense(licenseNumber) {
        try {
          return await licenseService.getLicense(licenseNumber);
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async renewLicense(licenseNumber, renewalData) {
        try {
          return await licenseService.renewLicense(licenseNumber, renewalData);
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async revokeLicense(licenseNumber, reason) {
        try {
          return await licenseService.revokeLicense(licenseNumber, reason);
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getTenantLicense(tenantId) {
        try {
          return await licenseService.getTenantLicense(tenantId);
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getLicenseAnalytics() {
        try {
          return await licenseService.getLicenseAnalytics();
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getLicenseUsageAnalytics(dateRange) {
        try {
          return await licenseService.getLicenseUsageAnalytics(dateRange);
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async getExpiringLicenses(days) {
        try {
          return await licenseService.getExpiringLicenses(days);
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      },

      async healthCheck() {
        try {
          return await licenseService.healthCheck();
        } catch (error) {
          setLicenseServerStatus(prev => ({ ...prev, error: error.message }));
          throw error;
        }
      }
    },

    // Combined operations that use both APIs
    async createTenantWithLicense(tenantData, licenseData) {
      try {
        // First create the tenant
        const tenantResponse = await this.platform.createTenant(tenantData);
        
        if (tenantResponse.success) {
          // Then create the license
          const licenseResponse = await this.license.createLicense({
            ...licenseData,
            tenantId: tenantResponse.data.tenantId || tenantResponse.data._id,
            tenantName: tenantResponse.data.name
          });

          if (licenseResponse.success) {
            // Update tenant with license information
            await this.platform.updateTenant(tenantResponse.data.tenantId || tenantResponse.data._id, {
              license: {
                licenseKey: licenseResponse.data.token,
                licenseNumber: licenseResponse.data.licenseNumber,
                licenseType: licenseData.type,
                licenseExpiresAt: licenseData.expiresAt,
                licenseStatus: 'active',
                activatedAt: new Date()
              }
            });
          }

          return {
            tenant: tenantResponse.data,
            license: licenseResponse.data
          };
        }

        throw new Error('Failed to create tenant');
      } catch (error) {
        throw new Error(`Failed to create tenant with license: ${error.message}`);
      }
    }
  };

  const contextValue = {
    // API wrapper
    api: apiWrapper,
    
    // Connection status
    status: {
      platform: platformStatus,
      licenseServer: licenseServerStatus,
      realtime: realtimeStatus
    },

    // Health check functions
    checkHealth: {
      platform: checkPlatformHealth,
      licenseServer: checkLicenseServerHealth
    },

    // Overall system health
    isHealthy: platformStatus.connected && licenseServerStatus.connected,
    hasErrors: platformStatus.error || licenseServerStatus.error || realtimeStatus.error
  };

  return (
    <ApiContext.Provider value={contextValue}>
      {children}
    </ApiContext.Provider>
  );
};

export default ApiContext;