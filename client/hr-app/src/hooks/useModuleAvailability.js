/**
 * Module Availability Hook
 * 
 * React hook for checking module availability based on tenant configuration and license.
 * Provides utilities for showing/hiding features based on module availability.
 * 
 * Requirements: 5.1, 4.2, 4.5
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import api from '../services/api';

/**
 * Custom hook for module availability management
 * 
 * @returns {Object} Module availability state and functions
 */
export const useModuleAvailability = () => {
    const { user, isAuthenticated } = useAuth();
    const [availability, setAvailability] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(null);

    // Cache duration in milliseconds (5 minutes)
    const CACHE_DURATION = 5 * 60 * 1000;

    /**
     * Fetch module availability from API
     */
    const fetchAvailability = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/modules/availability');
            
            if (response.data.success) {
                setAvailability(response.data.data);
                setLastFetch(Date.now());
            } else {
                throw new Error(response.data.message || 'Failed to fetch module availability');
            }
        } catch (err) {
            console.error('Failed to fetch module availability:', err);
            setError(err.message || 'Failed to fetch module availability');
            
            // Set default availability on error (only core modules)
            setAvailability({
                tenant: { id: null, name: null, enabledModules: [] },
                license: { valid: false, features: [], licenseType: null },
                modules: {
                    core: ['hr-core'],
                    available: [],
                    unavailable: [],
                    total: 1
                }
            });
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    /**
     * Check if cache is still valid
     */
    const isCacheValid = useMemo(() => {
        if (!lastFetch) return false;
        return (Date.now() - lastFetch) < CACHE_DURATION;
    }, [lastFetch]);

    /**
     * Refresh availability data
     */
    const refresh = useCallback(async () => {
        await fetchAvailability();
    }, [fetchAvailability]);

    /**
     * Check if a specific module is available
     */
    const isModuleAvailable = useCallback((moduleName) => {
        if (!availability) return false;
        
        const { core, available } = availability.modules;
        return core.includes(moduleName) || available.includes(moduleName);
    }, [availability]);

    /**
     * Check if a specific module is unavailable and get the reason
     */
    const getModuleUnavailabilityReason = useCallback((moduleName) => {
        if (!availability) return null;
        
        const unavailable = availability.modules.unavailable.find(m => m.name === moduleName);
        return unavailable ? unavailable.reason : null;
    }, [availability]);

    /**
     * Get all available modules
     */
    const getAvailableModules = useCallback(() => {
        if (!availability) return [];
        
        const { core, available } = availability.modules;
        return [...core, ...available];
    }, [availability]);

    /**
     * Check if license is valid
     */
    const isLicenseValid = useMemo(() => {
        return availability?.license?.valid || false;
    }, [availability]);

    /**
     * Get license features
     */
    const getLicenseFeatures = useMemo(() => {
        return availability?.license?.features || [];
    }, [availability]);

    /**
     * Check if a specific license feature is available
     */
    const hasLicenseFeature = useCallback((featureName) => {
        const features = getLicenseFeatures;
        return features.includes(featureName);
    }, [getLicenseFeatures]);

    /**
     * Get tenant information
     */
    const getTenantInfo = useMemo(() => {
        return availability?.tenant || { id: null, name: null, enabledModules: [] };
    }, [availability]);

    // Fetch availability on mount and when authentication changes
    useEffect(() => {
        if (isAuthenticated && (!availability || !isCacheValid)) {
            fetchAvailability();
        }
    }, [isAuthenticated, fetchAvailability, availability, isCacheValid]);

    // Auto-refresh every 5 minutes if component is still mounted
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            if (!isCacheValid) {
                fetchAvailability();
            }
        }, CACHE_DURATION);

        return () => clearInterval(interval);
    }, [isAuthenticated, fetchAvailability, isCacheValid]);

    return {
        // State
        availability,
        loading,
        error,
        isLicenseValid,
        
        // Functions
        isModuleAvailable,
        getModuleUnavailabilityReason,
        getAvailableModules,
        hasLicenseFeature,
        getLicenseFeatures,
        getTenantInfo,
        refresh,
        
        // Utilities
        isCacheValid,
        lastFetch
    };
};

/**
 * Hook for checking a specific module's availability
 * 
 * @param {string} moduleName - Name of the module to check
 * @returns {Object} Module-specific availability state
 */
export const useModuleCheck = (moduleName) => {
    const { 
        isModuleAvailable, 
        getModuleUnavailabilityReason, 
        loading, 
        error,
        refresh 
    } = useModuleAvailability();

    const available = isModuleAvailable(moduleName);
    const unavailabilityReason = getModuleUnavailabilityReason(moduleName);

    return {
        available,
        unavailabilityReason,
        loading,
        error,
        refresh
    };
};

/**
 * Higher-order component for module-based conditional rendering
 * 
 * @param {string} moduleName - Required module name
 * @param {React.Component} fallback - Component to render when module is unavailable
 * @returns {Function} HOC function
 */
export const withModuleCheck = (moduleName, fallback = null) => {
    return (WrappedComponent) => {
        const ModuleCheckedComponent = (props) => {
            const { available, loading, unavailabilityReason } = useModuleCheck(moduleName);

            if (loading) {
                return <div>Loading module availability...</div>;
            }

            if (!available) {
                if (fallback) {
                    return fallback;
                }
                
                return (
                    <div className="module-unavailable">
                        <h3>Module Not Available</h3>
                        <p>
                            This feature is not enabled for your organization. 
                            {unavailabilityReason === 'module_disabled' && 
                                ` Please contact your administrator to enable the ${moduleName} module.`
                            }
                            {unavailabilityReason === 'feature_not_licensed' && 
                                ` This feature requires a license upgrade.`
                            }
                            {unavailabilityReason === 'license_invalid' && 
                                ` Please ensure your license is valid and up to date.`
                            }
                        </p>
                    </div>
                );
            }

            return <WrappedComponent {...props} />;
        };

        ModuleCheckedComponent.displayName = `withModuleCheck(${WrappedComponent.displayName || WrappedComponent.name})`;
        
        return ModuleCheckedComponent;
    };
};

export default useModuleAvailability;