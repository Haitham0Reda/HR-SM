import React, { useEffect, createContext, useContext } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import {
  fetchModuleAvailability,
  refreshModuleAvailability,
  selectModules,
  selectModuleAvailability,
  selectEnabledModules,
  selectModuleLoading,
  selectModuleError,
  selectIsModuleEnabled,
  selectModuleUnavailabilityReason,
  selectIsLicenseValid,
  selectLicenseFeatures,
  selectHasLicenseFeature,
  selectIsCacheStale
} from '../slices/moduleSlice';
import { selectIsAuthenticated, selectUser } from '../slices/authSlice';

// Create context for backward compatibility
const ReduxModuleContext = createContext(null);

export const useModules = () => {
  const context = useContext(ReduxModuleContext);
  if (!context) {
    throw new Error('useModules must be used within ReduxModuleProvider');
  }
  return context;
};

export const ReduxModuleProvider = ({ children }) => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const modules = useAppSelector(selectModules);
  const moduleAvailability = useAppSelector(selectModuleAvailability);
  const enabledModules = useAppSelector(selectEnabledModules);
  const loading = useAppSelector(selectModuleLoading);
  const error = useAppSelector(selectModuleError);
  const isCacheStale = useAppSelector(selectIsCacheStale);

  // Fetch module availability when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      // Only fetch if we have both authentication and user data
      dispatch(fetchModuleAvailability());
    }
  }, [isAuthenticated, user, dispatch]);

  // Auto-refresh every 5 minutes if data is stale
  useEffect(() => {
    if (!isAuthenticated || !moduleAvailability || !user) return;

    const interval = setInterval(() => {
      if (isCacheStale) {
        console.log('Module availability cache is stale, refreshing...');
        dispatch(fetchModuleAvailability());
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, moduleAvailability, isCacheStale, user, dispatch]);

  // Retry failed requests after a delay
  useEffect(() => {
    if (error && isAuthenticated && user) {
      console.log('Module availability failed, retrying in 10 seconds...');
      const retryTimeout = setTimeout(() => {
        dispatch(fetchModuleAvailability());
      }, 10000); // 10 seconds

      return () => clearTimeout(retryTimeout);
    }
  }, [error, isAuthenticated, user, dispatch]);

  /**
   * Check if a module is enabled for the current tenant
   */
  const isModuleEnabled = (moduleId) => {
    // Admin users have access to all modules (bypass license checks)
    if (user && user.role === 'admin') {
      return true;
    }
    
    // HR-Core is always enabled for all users
    if (moduleId === 'hr-core') {
      return true;
    }

    return enabledModules.includes(moduleId);
  };

  /**
   * Get the reason why a module is unavailable
   */
  const getModuleUnavailabilityReason = (moduleId) => {
    if (isModuleEnabled(moduleId)) {
      return null;
    }

    if (!moduleAvailability) {
      return 'loading';
    }

    const unavailable = moduleAvailability.modules.unavailable.find(m => m.name === moduleId);
    return unavailable ? unavailable.reason : 'module_not_found';
  };

  /**
   * Check if all specified modules are enabled
   */
  const areModulesEnabled = (moduleIds) => {
    return moduleIds.every(moduleId => isModuleEnabled(moduleId));
  };

  /**
   * Check if any of the specified modules are enabled
   */
  const isAnyModuleEnabled = (moduleIds) => {
    return moduleIds.some(moduleId => isModuleEnabled(moduleId));
  };

  /**
   * Get list of enabled module IDs
   */
  const getEnabledModules = () => {
    // Admin users get all available modules
    if (user && user.role === 'admin') {
      return ['hr-core', 'tasks', 'documents', 'reports', 'payroll', 'life-insurance', 'clinic'];
    }
    
    return enabledModules;
  };

  /**
   * Check if license is valid
   */
  const isLicenseValid = () => {
    return moduleAvailability?.license?.valid || false;
  };

  /**
   * Get license features
   */
  const getLicenseFeatures = () => {
    return moduleAvailability?.license?.features || [];
  };

  /**
   * Check if a specific license feature is available
   */
  const hasLicenseFeature = (featureName) => {
    const features = getLicenseFeatures();
    return features.includes(featureName);
  };

  /**
   * Refresh module availability data
   */
  const refresh = async () => {
    if (isAuthenticated) {
      await dispatch(refreshModuleAvailability());
    }
  };

  const value = {
    // Legacy compatibility
    enabledModules: getEnabledModules(),
    moduleDetails: moduleAvailability?.modules || {},
    loading,
    error,
    
    // Module availability functions
    isModuleEnabled,
    getModuleUnavailabilityReason,
    areModulesEnabled,
    isAnyModuleEnabled,
    
    // License functions
    isLicenseValid,
    getLicenseFeatures,
    hasLicenseFeature,
    
    // Utility functions
    refresh,
    
    // Raw data
    moduleAvailability
  };

  return (
    <ReduxModuleContext.Provider value={value}>
      {children}
    </ReduxModuleContext.Provider>
  );
};