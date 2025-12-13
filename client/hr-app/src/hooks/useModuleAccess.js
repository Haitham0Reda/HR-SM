import { useState, useEffect, useContext, createContext } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import axios from 'axios';

// Module Access Context
const ModuleAccessContext = createContext();

// Helper function to create company API instance
const createCompanyApi = (companySlug) => {
  const companyApi = axios.create({
    baseURL: process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'http://localhost:5000',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'x-company-slug': companySlug
    }
  });

  // Add authentication token
  const tenantToken = localStorage.getItem('tenant_token') || localStorage.getItem('token');
  if (tenantToken) {
    companyApi.defaults.headers.Authorization = `Bearer ${tenantToken}`;
  }

  return companyApi;
};

// Module Access Provider
export function ModuleAccessProvider({ children }) {
  const [moduleAccess, setModuleAccess] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, companySlug } = useAuth();

  useEffect(() => {
    if (companySlug) {
      loadModuleAccess();
    }
  }, [companySlug]);

  const loadModuleAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get company modules from the platform API (no auth required)
      const response = await axios.get(`${process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}/api/platform/companies/${companySlug}/modules`);
      
      if (response.data.success) {
        const modules = response.data.data.availableModules || {};
        const accessMap = {};
        
        // Create access map for easy checking
        Object.entries(modules).forEach(([moduleKey, moduleInfo]) => {
          accessMap[moduleKey] = {
            hasAccess: moduleInfo.enabled,
            tier: moduleInfo.tier,
            limits: moduleInfo.limits,
            info: {
              name: moduleInfo.name,
              description: moduleInfo.description,
              category: moduleInfo.category,
              required: moduleInfo.required,
              canDisable: moduleInfo.canDisable
            }
          };
        });

        setModuleAccess(accessMap);
      } else {
        throw new Error(response.data.message || 'Failed to load module access');
      }
    } catch (err) {
      console.error('Failed to load module access:', err);
      setError(err.message);
      setModuleAccess({});
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = (moduleKey) => {
    // Admin users have access to all modules
    if (user && user.role === 'admin') {
      return true;
    }
    
    const access = moduleAccess[moduleKey];
    return access ? access.hasAccess : false;
  };

  const getModuleInfo = (moduleKey) => {
    return moduleAccess[moduleKey] || null;
  };

  const hasAnyAccess = (moduleKeys) => {
    return moduleKeys.some(key => checkAccess(key));
  };

  const hasAllAccess = (moduleKeys) => {
    return moduleKeys.every(key => checkAccess(key));
  };

  const getEnabledModules = () => {
    // Admin users get all available modules
    if (user && user.role === 'admin') {
      return Object.keys(moduleAccess);
    }
    
    return Object.entries(moduleAccess)
      .filter(([key, access]) => access.hasAccess)
      .map(([key]) => key);
  };

  const refreshAccess = () => {
    loadModuleAccess();
  };

  const value = {
    moduleAccess,
    loading,
    error,
    checkAccess,
    getModuleInfo,
    hasAnyAccess,
    hasAllAccess,
    getEnabledModules,
    refreshAccess
  };

  return (
    <ModuleAccessContext.Provider value={value}>
      {children}
    </ModuleAccessContext.Provider>
  );
}

// Hook to use module access
export function useModuleAccess() {
  const context = useContext(ModuleAccessContext);
  if (!context) {
    throw new Error('useModuleAccess must be used within a ModuleAccessProvider');
  }
  return context;
}

// Hook for specific module access
export function useModule(moduleKey) {
  const { checkAccess, getModuleInfo, loading, error } = useModuleAccess();
  
  return {
    hasAccess: checkAccess(moduleKey),
    moduleInfo: getModuleInfo(moduleKey),
    loading,
    error
  };
}

// Hook for multiple modules
export function useModules(moduleKeys) {
  const { moduleAccess, hasAnyAccess, hasAllAccess, loading, error } = useModuleAccess();
  
  const moduleResults = {};
  moduleKeys.forEach(key => {
    moduleResults[key] = moduleAccess[key] || { hasAccess: false };
  });

  return {
    modules: moduleResults,
    hasAnyAccess: hasAnyAccess(moduleKeys),
    hasAllAccess: hasAllAccess(moduleKeys),
    loading,
    error
  };
}

// Higher-order component for module protection
export function withModuleAccess(WrappedComponent, requiredModules, options = {}) {
  const { requireAll = false, fallbackComponent: FallbackComponent } = options;

  return function ModuleProtectedComponent(props) {
    const { hasAnyAccess, hasAllAccess, loading, error } = useModuleAccess();
    const { user } = useAuth();
    
    if (loading) {
      return <div>Loading module access...</div>;
    }

    if (error) {
      return <div>Error loading module access: {error}</div>;
    }

    // Admin users bypass module restrictions
    if (user && user.role === 'admin') {
      return <WrappedComponent {...props} />;
    }

    const hasAccess = requireAll 
      ? hasAllAccess(requiredModules)
      : hasAnyAccess(requiredModules);

    if (!hasAccess) {
      if (FallbackComponent) {
        return <FallbackComponent requiredModules={requiredModules} />;
      }
      
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Access Denied</h3>
          <p>You don't have access to the required modules: {requiredModules.join(', ')}</p>
          <p>Please contact your administrator to enable these modules.</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}

// Component for conditional module rendering
export function ModuleGuard({ 
  modules, 
  requireAll = false, 
  children, 
  fallback = null,
  loadingComponent = <div>Loading...</div>
}) {
  const { hasAnyAccess, hasAllAccess, loading, error } = useModuleAccess();
  const { user } = useAuth();
  
  if (loading) {
    return loadingComponent;
  }

  if (error) {
    return fallback || <div>Error: {error}</div>;
  }

  // Admin users bypass module restrictions
  if (user && user.role === 'admin') {
    return children;
  }

  const moduleArray = Array.isArray(modules) ? modules : [modules];
  const hasAccess = requireAll 
    ? hasAllAccess(moduleArray)
    : hasAnyAccess(moduleArray);

  if (!hasAccess) {
    return fallback;
  }

  return children;
}

// Hook for usage tracking
export function useUsageTracking() {
  const { companySlug } = useAuth();

  const trackUsage = async (moduleKey, usageData) => {
    try {
      const companyApi = createCompanyApi(companySlug);
      await companyApi.post('/api/company/usage', {
        module: moduleKey,
        usage: usageData
      });
    } catch (error) {
      console.error('Failed to track usage:', error);
    }
  };

  const trackEmployeeCount = async (count) => {
    try {
      const companyApi = createCompanyApi(companySlug);
      await companyApi.put('/api/company/usage', {
        employees: count
      });
    } catch (error) {
      console.error('Failed to track employee count:', error);
    }
  };

  const trackStorageUsage = async (bytes) => {
    try {
      const companyApi = createCompanyApi(companySlug);
      await companyApi.put('/api/company/usage', {
        storage: bytes
      });
    } catch (error) {
      console.error('Failed to track storage usage:', error);
    }
  };

  const trackApiCall = async (moduleKey) => {
    try {
      const companyApi = createCompanyApi(companySlug);
      await companyApi.post('/api/company/usage/api-call', {
        module: moduleKey
      });
    } catch (error) {
      console.error('Failed to track API call:', error);
    }
  };

  return {
    trackUsage,
    trackEmployeeCount,
    trackStorageUsage,
    trackApiCall
  };
}

export default useModuleAccess;