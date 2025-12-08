import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const LicenseContext = createContext(null);

/**
 * LicenseProvider Component
 * Manages license state and provides hooks for checking module access and usage limits
 */
export const LicenseProvider = ({ children }) => {
    const [licenses, setLicenses] = useState({});
    const [usage, setUsage] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isAuthenticated, user } = useAuth();

    /**
     * Fetch license data from the backend
     */
    const fetchLicenses = useCallback(async () => {
        if (!isAuthenticated || !user?.tenantId) {
            setLoading(false);
            return;
        }

        try {
            setError(null);

            // Fetch license information
            const licenseResponse = await axios.get(`/api/v1/licenses/${user.tenantId}`);
            const licenseData = licenseResponse.data.data;

            // Transform license data into a map for easy lookup
            const licenseMap = {};
            if (licenseData && licenseData.modules) {
                licenseData.modules.forEach(module => {
                    licenseMap[module.key] = {
                        enabled: module.enabled,
                        tier: module.tier,
                        limits: module.limits || {},
                        activatedAt: module.activatedAt,
                        expiresAt: module.expiresAt,
                        status: licenseData.status,
                        billingCycle: licenseData.billingCycle
                    };
                });
            }

            setLicenses(licenseMap);

            // Fetch usage data
            try {
                const usageResponse = await axios.get(`/api/v1/licenses/${user.tenantId}/usage`);
                const usageData = usageResponse.data.data;

                // Transform usage data into a map
                const usageMap = {};
                if (Array.isArray(usageData)) {
                    usageData.forEach(moduleUsage => {
                        usageMap[moduleUsage.moduleKey] = {
                            employees: {
                                current: moduleUsage.usage?.employees || 0,
                                limit: moduleUsage.limits?.employees || null,
                                percentage: moduleUsage.usage?.employees && moduleUsage.limits?.employees
                                    ? Math.round((moduleUsage.usage.employees / moduleUsage.limits.employees) * 100)
                                    : null
                            },
                            storage: {
                                current: moduleUsage.usage?.storage || 0,
                                limit: moduleUsage.limits?.storage || null,
                                percentage: moduleUsage.usage?.storage && moduleUsage.limits?.storage
                                    ? Math.round((moduleUsage.usage.storage / moduleUsage.limits.storage) * 100)
                                    : null
                            },
                            apiCalls: {
                                current: moduleUsage.usage?.apiCalls || 0,
                                limit: moduleUsage.limits?.apiCalls || null,
                                percentage: moduleUsage.usage?.apiCalls && moduleUsage.limits?.apiCalls
                                    ? Math.round((moduleUsage.usage.apiCalls / moduleUsage.limits.apiCalls) * 100)
                                    : null
                            },
                            warnings: moduleUsage.warnings || [],
                            violations: moduleUsage.violations || []
                        };
                    });
                }

                setUsage(usageMap);
            } catch (usageError) {
                // Usage data is optional, don't fail if it's not available
                console.warn('Failed to load usage data:', usageError);
            }

        } catch (err) {
            console.error('Failed to load license data:', err);
            setError(err.response?.data?.message || 'Failed to load license information');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, user]);

    // Load licenses on mount and when authentication changes
    useEffect(() => {
        fetchLicenses();
    }, [fetchLicenses]);

    /**
     * Check if a module is enabled
     * @param {string} moduleKey - The module key to check
     * @returns {boolean} True if module is enabled
     */
    const isModuleEnabled = useCallback((moduleKey) => {
        // Core HR is always enabled
        if (moduleKey === 'hr-core') {
            return true;
        }

        const license = licenses[moduleKey];
        return license ? license.enabled : false;
    }, [licenses]);

    /**
     * Get license information for a specific module
     * @param {string} moduleKey - The module key
     * @returns {Object|null} License information or null
     */
    const getModuleLicense = useCallback((moduleKey) => {
        // Core HR always returns a default license
        if (moduleKey === 'hr-core') {
            return {
                enabled: true,
                tier: 'enterprise',
                limits: {},
                status: 'active'
            };
        }

        return licenses[moduleKey] || null;
    }, [licenses]);

    /**
     * Check if a module is approaching its usage limit
     * @param {string} moduleKey - The module key
     * @param {string} limitType - The limit type (employees, storage, apiCalls)
     * @returns {boolean} True if usage is >= 80% of limit
     */
    const isApproachingLimit = useCallback((moduleKey, limitType) => {
        const moduleUsage = usage[moduleKey];

        if (!moduleUsage || !moduleUsage[limitType]) {
            return false;
        }

        const { percentage } = moduleUsage[limitType];
        return percentage !== null && percentage >= 80;
    }, [usage]);

    /**
     * Get usage information for a specific module
     * @param {string} moduleKey - The module key
     * @returns {Object|null} Usage information or null
     */
    const getModuleUsage = useCallback((moduleKey) => {
        return usage[moduleKey] || null;
    }, [usage]);

    /**
     * Check if a module license is expired
     * @param {string} moduleKey - The module key
     * @returns {boolean} True if license is expired
     */
    const isLicenseExpired = useCallback((moduleKey) => {
        const license = licenses[moduleKey];

        if (!license) {
            return false;
        }

        if (license.status === 'expired') {
            return true;
        }

        if (license.expiresAt) {
            return new Date(license.expiresAt) < new Date();
        }

        return false;
    }, [licenses]);

    /**
     * Get days until license expiration
     * @param {string} moduleKey - The module key
     * @returns {number|null} Days until expiration or null
     */
    const getDaysUntilExpiration = useCallback((moduleKey) => {
        const license = licenses[moduleKey];

        if (!license || !license.expiresAt) {
            return null;
        }

        const now = new Date();
        const expiresAt = new Date(license.expiresAt);
        const diffTime = expiresAt - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }, [licenses]);

    /**
     * Check if license is expiring soon (within threshold days)
     * @param {string} moduleKey - The module key
     * @param {number} daysThreshold - Days threshold (default: 30)
     * @returns {boolean} True if expiring within threshold
     */
    const isExpiringSoon = useCallback((moduleKey, daysThreshold = 30) => {
        const daysUntil = getDaysUntilExpiration(moduleKey);

        if (daysUntil === null) {
            return false;
        }

        return daysUntil > 0 && daysUntil <= daysThreshold;
    }, [getDaysUntilExpiration]);

    /**
     * Refresh license data
     */
    const refreshLicenses = useCallback(async () => {
        setLoading(true);
        await fetchLicenses();
    }, [fetchLicenses]);

    /**
     * Get all enabled modules
     * @returns {string[]} Array of enabled module keys
     */
    const getEnabledModules = useCallback(() => {
        return Object.keys(licenses).filter(key => licenses[key].enabled);
    }, [licenses]);

    /**
     * Check if any module has usage warnings
     * @returns {boolean} True if any warnings exist
     */
    const hasUsageWarnings = useCallback(() => {
        return Object.values(usage).some(moduleUsage =>
            moduleUsage.warnings && moduleUsage.warnings.length > 0
        );
    }, [usage]);

    /**
     * Check if any module has usage violations
     * @returns {boolean} True if any violations exist
     */
    const hasUsageViolations = useCallback(() => {
        return Object.values(usage).some(moduleUsage =>
            moduleUsage.violations && moduleUsage.violations.length > 0
        );
    }, [usage]);

    const value = {
        // State
        licenses,
        usage,
        loading,
        error,

        // Module access checks
        isModuleEnabled,
        getModuleLicense,
        getEnabledModules,

        // Usage checks
        isApproachingLimit,
        getModuleUsage,
        hasUsageWarnings,
        hasUsageViolations,

        // Expiration checks
        isLicenseExpired,
        getDaysUntilExpiration,
        isExpiringSoon,

        // Actions
        refreshLicenses
    };

    return (
        <LicenseContext.Provider value={value}>
            {children}
        </LicenseContext.Provider>
    );
};

export const useLicense = () => {
    const context = useContext(LicenseContext);
    if (!context) {
        throw new Error('useLicense must be used within LicenseProvider');
    }
    return context;
};

export default LicenseContext;
