import { useState, useEffect, useCallback } from 'react';
import realtimeService from '../services/realtimeService';

/**
 * Custom hook for real-time data subscriptions
 * @param {string} event - Event name to subscribe to
 * @param {function} callback - Callback function for data updates
 * @returns {object} Connection status and utilities
 */
export const useRealtime = (event, callback) => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to connection status
    const unsubscribeConnection = realtimeService.subscribe('connection', (status) => {
      setConnected(status.connected);
      if (status.error) {
        setError(status.error);
      } else {
        setError(null);
      }
    });

    // Subscribe to the specific event if provided
    let unsubscribeEvent = null;
    if (event && callback) {
      unsubscribeEvent = realtimeService.subscribe(event, callback);
    }

    return () => {
      unsubscribeConnection();
      if (unsubscribeEvent) {
        unsubscribeEvent();
      }
    };
  }, [event, callback]);

  const requestUpdate = useCallback((data) => {
    if (event === 'metrics') {
      realtimeService.requestMetricsUpdate();
    } else if (event === 'tenants' && data?.tenantId) {
      realtimeService.requestTenantUpdate(data.tenantId);
    }
  }, [event]);

  const sendCommand = useCallback((command, data) => {
    realtimeService.sendCommand(command, data);
  }, []);

  return {
    connected,
    error,
    requestUpdate,
    sendCommand,
    connectionStatus: realtimeService.getConnectionStatus()
  };
};

/**
 * Hook specifically for system metrics
 */
export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleMetricsUpdate = useCallback((data) => {
    if (data.system) {
      setMetrics(data.system);
      setLoading(false);
    }
  }, []);

  const { connected, error, requestUpdate } = useRealtime('metrics', handleMetricsUpdate);

  useEffect(() => {
    // Request initial metrics
    requestUpdate();
  }, [requestUpdate]);

  return {
    metrics,
    loading,
    connected,
    error,
    refresh: requestUpdate
  };
};

/**
 * Hook specifically for tenant data
 */
export const useTenantData = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleTenantUpdate = useCallback((data) => {
    if (data.type === 'tenant-list') {
      setTenants(data.tenants);
      setLoading(false);
    } else if (data.type === 'tenant-update') {
      setTenants(prev => prev.map(tenant => 
        tenant._id === data.tenantId ? { ...tenant, ...data.updates } : tenant
      ));
    } else if (data.type === 'tenant-metrics') {
      setTenants(prev => prev.map(tenant => 
        tenant._id === data.tenantId 
          ? { ...tenant, metrics: { ...tenant.metrics, ...data.metrics } }
          : tenant
      ));
    }
  }, []);

  const { connected, error, requestUpdate } = useRealtime('tenants', handleTenantUpdate);

  const refreshTenant = useCallback((tenantId) => {
    requestUpdate({ tenantId });
  }, [requestUpdate]);

  return {
    tenants,
    loading,
    connected,
    error,
    refreshTenant,
    refresh: requestUpdate
  };
};

/**
 * Hook for system alerts
 */
export const useSystemAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);

  const handleAlert = useCallback((alert) => {
    const newAlert = {
      id: Date.now(),
      timestamp: new Date(),
      ...alert
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 49)]); // Keep last 50 alerts
    
    // Show critical alerts immediately
    if (alert.level === 'critical') {
      setCurrentAlert({
        severity: 'error',
        message: `Critical Alert: ${alert.message}`
      });
    } else if (alert.level === 'warning') {
      setCurrentAlert({
        severity: 'warning',
        message: `Warning: ${alert.message}`
      });
    }
  }, []);

  const { connected } = useRealtime('alerts', handleAlert);

  const dismissCurrentAlert = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    currentAlert,
    connected,
    dismissCurrentAlert,
    clearAlerts
  };
};

/**
 * Hook for license data updates
 */
export const useLicenseData = () => {
  const [licenses, setLicenses] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);

  const handleLicenseUpdate = useCallback((data) => {
    if (data.type === 'license-analytics') {
      setAnalytics(data.analytics);
      setLicenses(data.licenses || []);
      setLoading(false);
    } else if (data.type === 'license-update') {
      setLicenses(prev => prev.map(license => 
        license.licenseNumber === data.licenseNumber 
          ? { ...license, ...data.updates }
          : license
      ));
    } else if (data.type === 'license-created') {
      setLicenses(prev => [data.license, ...prev]);
      setAnalytics(prev => ({
        ...prev,
        total: (prev.total || 0) + 1,
        active: (prev.active || 0) + 1
      }));
    } else if (data.type === 'license-revoked') {
      setLicenses(prev => prev.map(license => 
        license.licenseNumber === data.licenseNumber 
          ? { ...license, status: 'revoked' }
          : license
      ));
    }
  }, []);

  const { connected, error, requestUpdate } = useRealtime('licenses', handleLicenseUpdate);

  const refreshLicense = useCallback((licenseNumber) => {
    requestUpdate({ licenseNumber });
  }, [requestUpdate]);

  return {
    licenses,
    analytics,
    loading,
    connected,
    error,
    refreshLicense,
    refresh: requestUpdate
  };
};

/**
 * Hook for performance metrics
 */
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    responseTime: { average: 0, p95: 0, p99: 0 },
    throughput: { requestsPerSecond: 0, totalRequests: 0 },
    errorRate: { percentage: 0, totalErrors: 0 },
    uptime: { percentage: 99.9, downtime: 0 }
  });
  const [loading, setLoading] = useState(true);

  const handlePerformanceUpdate = useCallback((data) => {
    if (data.performance) {
      setMetrics(data.performance);
      setLoading(false);
    }
  }, []);

  const { connected, error, requestUpdate } = useRealtime('performance', handlePerformanceUpdate);

  return {
    metrics,
    loading,
    connected,
    error,
    refresh: requestUpdate
  };
};

/**
 * Hook for connection quality monitoring
 */
export const useConnectionQuality = () => {
  const [quality, setQuality] = useState({
    latency: 0,
    packetLoss: 0,
    reconnectCount: 0,
    lastReconnect: null
  });

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe('connection', (status) => {
      if (status.reconnected) {
        setQuality(prev => ({
          ...prev,
          reconnectCount: prev.reconnectCount + 1,
          lastReconnect: new Date()
        }));
      }
      
      if (status.latency !== undefined) {
        setQuality(prev => ({
          ...prev,
          latency: status.latency
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  return quality;
};
export default useRealtime;