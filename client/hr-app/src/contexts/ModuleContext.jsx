/**
 * Module Context
 * 
 * Manages enabled modules for the current tenant with license validation.
 * Fetches module configuration on login and provides module status checks.
 * Integrates with license server for feature-based access control.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../store/providers/ReduxAuthProvider';

const ModuleContext = createContext(null);

export const useModules = () => {
    const context = useContext(ModuleContext);
    if (!context) {
        throw new Error('useModules must be used within ModuleProvider');
    }
    return context;
};

export const ModuleProvider = ({ children }) => {
    const { isAuthenticated, companySlug, user } = useAuth();
    const [moduleAvailability, setModuleAvailability] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);

    // Cache duration in milliseconds (5 minutes)
    const CACHE_DURATION = 5 * 60 * 1000;

    // Memoized function to fetch module availability
    const fetchModuleAvailability = useCallback(async (showLoading = true) => {
        if (!isAuthenticated) {
            setModuleAvailability(null);
            setLoading(false);
            return;
        }

        try {
            if (showLoading) setLoading(true);
            setError(null);

            console.log('Fetching module availability for tenant');

            // Use the new module availability API endpoint
            const response = await api.get('/modules/availability');
            
            if (response.data.success) {
                const availability = response.data.data;
                
                console.log('Module availability loaded:', {
                    tenant: availability.tenant.name,
                    totalAvailable: availability.modules.total,
                    availableModules: [...availability.modules.core, ...availability.modules.available],
                    licenseValid: availability.license.valid
                });
                
                setModuleAvailability(availability);
                setLastFetch(Date.now());
            } else {
                throw new Error(response.data.message || 'Failed to load module availability');
            }
        } catch (err) {
            console.error('Failed to fetch module availability:', err);
            
            // In development, provide default configuration
            if (process.env.NODE_ENV === 'development') {
                console.warn('Using default module configuration for development');
                setModuleAvailability({
                    tenant: { id: 'dev', name: 'Development', enabledModules: [] },
                    license: { valid: true, features: ['life-insurance'], licenseType: 'development' },
                    modules: {
                        core: ['hr-core'],
                        available: ['tasks', 'documents', 'reports', 'life-insurance'],
                        unavailable: [],
                        total: 5
                    }
                });
            } else {
                setError(err.message || 'Failed to load module availability');
                // Fallback to core modules only
                setModuleAvailability({
                    tenant: { id: null, name: null, enabledModules: [] },
                    license: { valid: false, features: [], licenseType: null },
                    modules: {
                        core: ['hr-core'],
                        available: [],
                        unavailable: [],
                        total: 1
                    }
                });
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [isAuthenticated]);

    // Fetch module availability when user logs in
    useEffect(() => {
        fetchModuleAvailability();
    }, [fetchModuleAvailability]);

    // Auto-refresh every 5 minutes if data is stale
    useEffect(() => {
        if (!isAuthenticated || !moduleAvailability || !lastFetch) return;

        const interval = setInterval(() => {
            const isStale = (Date.now() - lastFetch) > CACHE_DURATION;
            if (isStale) {
                console.log('Module availability cache is stale, refreshing...');
                // Re-fetch without showing loading state
                fetchModuleAvailability(false);
            }
        }, CACHE_DURATION);

        return () => clearInterval(interval);
    }, [isAuthenticated, moduleAvailability, lastFetch, fetchModuleAvailability, CACHE_DURATION]);

    /**
     * Check if a module is enabled for the current tenant
     * @param {string} moduleId - Module identifier (e.g., 'tasks', 'life-insurance')
     * @returns {boolean} - Whether the module is enabled and licensed
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

        if (!moduleAvailability) {
            return false;
        }

        const { core, available } = moduleAvailability.modules;
        return core.includes(moduleId) || available.includes(moduleId);
    };

    /**
     * Get the reason why a module is unavailable
     * @param {string} moduleId - Module identifier
     * @returns {string|null} - Unavailability reason or null if available
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
     * @param {string[]} moduleIds - Array of module identifiers
     * @returns {boolean} - Whether all modules are enabled
     */
    const areModulesEnabled = (moduleIds) => {
        return moduleIds.every(moduleId => isModuleEnabled(moduleId));
    };

    /**
     * Check if any of the specified modules are enabled
     * @param {string[]} moduleIds - Array of module identifiers
     * @returns {boolean} - Whether any module is enabled
     */
    const isAnyModuleEnabled = (moduleIds) => {
        return moduleIds.some(moduleId => isModuleEnabled(moduleId));
    };

    /**
     * Get list of enabled module IDs
     * @returns {string[]} - Array of enabled module IDs
     */
    const getEnabledModules = () => {
        // Admin users get all available modules
        if (user && user.role === 'admin') {
            return ['hr-core', 'tasks', 'documents', 'reports', 'payroll', 'life-insurance', 'clinic'];
        }
        
        if (!moduleAvailability) {
            return ['hr-core'];
        }

        const { core, available } = moduleAvailability.modules;
        return [...core, ...available];
    };

    /**
     * Check if license is valid
     * @returns {boolean} - Whether the license is valid
     */
    const isLicenseValid = () => {
        return moduleAvailability?.license?.valid || false;
    };

    /**
     * Get license features
     * @returns {string[]} - Array of licensed features
     */
    const getLicenseFeatures = () => {
        return moduleAvailability?.license?.features || [];
    };

    /**
     * Check if a specific license feature is available
     * @param {string} featureName - Feature name to check
     * @returns {boolean} - Whether the feature is licensed
     */
    const hasLicenseFeature = (featureName) => {
        const features = getLicenseFeatures();
        return features.includes(featureName);
    };

    /**
     * Refresh module availability data
     */
    const refresh = useCallback(async () => {
        if (isAuthenticated) {
            await fetchModuleAvailability();
        }
    }, [isAuthenticated, fetchModuleAvailability]);

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
        <ModuleContext.Provider value={value}>
            {children}
        </ModuleContext.Provider>
    );
};

export default ModuleContext;
