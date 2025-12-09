import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const LicenseContext = createContext(null);

/**
 * LicenseProvider Component
 * Manages license state and provides hooks for checking module access and usage limits
 * Includes real-time WebSocket updates for license changes
 */
export const LicenseProvider = ({ children }) => {
    const [licenses, setLicenses] = useState({});
    const [usage, setUsage] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const { isAuthenticated, user } = useAuth();
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

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

    /**
     * Connect to WebSocket for real-time license updates
     */
    const connectWebSocket = useCallback(() => {
        if (!isAuthenticated || !user?.token) {
            return;
        }

        // Close existing connection if any
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            // Determine WebSocket URL based on current location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname;
            const port = process.env.REACT_APP_API_PORT || '5000';
            const wsUrl = `${protocol}//${host}:${port}/ws/license?token=${user.token}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('License WebSocket connected');
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('License WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('License WebSocket disconnected');
                wsRef.current = null;

                // Attempt to reconnect with exponential backoff
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    reconnectAttemptsRef.current++;
                    
                    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket();
                    }, delay);
                }
            };

        } catch (error) {
            console.error('Failed to connect to License WebSocket:', error);
        }
    }, [isAuthenticated, user]);

    /**
     * Handle incoming WebSocket messages
     */
    const handleWebSocketMessage = useCallback((message) => {
        console.log('License WebSocket message:', message);

        switch (message.type) {
            case 'connected':
                // Connection established
                break;

            case 'license_expiring':
                // License is expiring soon
                addNotification({
                    id: `expiring-${message.moduleKey}-${Date.now()}`,
                    type: 'license_expiring',
                    severity: message.severity,
                    moduleKey: message.moduleKey,
                    message: `License for ${message.moduleKey} expires in ${message.daysUntilExpiration} days`,
                    expiresAt: message.expiresAt,
                    daysUntilExpiration: message.daysUntilExpiration,
                    timestamp: message.timestamp
                });
                break;

            case 'license_expired':
                // License has expired
                addNotification({
                    id: `expired-${message.moduleKey}-${Date.now()}`,
                    type: 'license_expired',
                    severity: 'critical',
                    moduleKey: message.moduleKey,
                    message: `License for ${message.moduleKey} has expired`,
                    timestamp: message.timestamp
                });
                
                // Refresh license data to update UI
                fetchLicenses();
                break;

            case 'usage_limit_warning':
                // Usage approaching limit
                addNotification({
                    id: `warning-${message.moduleKey}-${message.limitType}-${Date.now()}`,
                    type: 'usage_limit_warning',
                    severity: message.severity,
                    moduleKey: message.moduleKey,
                    limitType: message.limitType,
                    message: `${message.moduleKey} ${message.limitType} usage at ${message.percentage}%`,
                    currentUsage: message.currentUsage,
                    limit: message.limit,
                    percentage: message.percentage,
                    timestamp: message.timestamp
                });
                
                // Update usage data
                setUsage(prev => ({
                    ...prev,
                    [message.moduleKey]: {
                        ...prev[message.moduleKey],
                        [message.limitType]: {
                            current: message.currentUsage,
                            limit: message.limit,
                            percentage: message.percentage
                        }
                    }
                }));
                break;

            case 'usage_limit_exceeded':
                // Usage limit exceeded
                addNotification({
                    id: `exceeded-${message.moduleKey}-${message.limitType}-${Date.now()}`,
                    type: 'usage_limit_exceeded',
                    severity: 'critical',
                    moduleKey: message.moduleKey,
                    limitType: message.limitType,
                    message: `${message.moduleKey} ${message.limitType} limit exceeded`,
                    currentUsage: message.currentUsage,
                    limit: message.limit,
                    timestamp: message.timestamp
                });
                
                // Update usage data
                setUsage(prev => ({
                    ...prev,
                    [message.moduleKey]: {
                        ...prev[message.moduleKey],
                        [message.limitType]: {
                            current: message.currentUsage,
                            limit: message.limit,
                            percentage: 100
                        }
                    }
                }));
                break;

            case 'module_activated':
                // Module has been activated
                addNotification({
                    id: `activated-${message.moduleKey}-${Date.now()}`,
                    type: 'module_activated',
                    severity: 'info',
                    moduleKey: message.moduleKey,
                    message: `Module ${message.moduleKey} has been activated`,
                    timestamp: message.timestamp
                });
                
                // Refresh license data
                fetchLicenses();
                break;

            case 'module_deactivated':
                // Module has been deactivated
                addNotification({
                    id: `deactivated-${message.moduleKey}-${Date.now()}`,
                    type: 'module_deactivated',
                    severity: 'warning',
                    moduleKey: message.moduleKey,
                    message: `Module ${message.moduleKey} has been deactivated`,
                    timestamp: message.timestamp
                });
                
                // Refresh license data
                fetchLicenses();
                break;

            case 'license_updated':
                // License has been updated
                addNotification({
                    id: `updated-${Date.now()}`,
                    type: 'license_updated',
                    severity: 'info',
                    message: 'License has been updated',
                    changes: message.changes,
                    timestamp: message.timestamp
                });
                
                // Refresh license data
                fetchLicenses();
                break;

            default:
                console.warn('Unknown WebSocket message type:', message.type);
        }
    }, [fetchLicenses]);

    /**
     * Add a notification to the queue
     */
    const addNotification = useCallback((notification) => {
        setNotifications(prev => [...prev, notification]);
    }, []);

    /**
     * Remove a notification from the queue
     */
    const removeNotification = useCallback((notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    /**
     * Clear all notifications
     */
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Load licenses on mount and when authentication changes
    useEffect(() => {
        fetchLicenses();
    }, [fetchLicenses]);

    // Connect to WebSocket when authenticated
    useEffect(() => {
        if (isAuthenticated && user?.token) {
            connectWebSocket();
        }

        // Cleanup on unmount
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [isAuthenticated, user, connectWebSocket]);

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
        notifications,

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
        refreshLicenses,
        
        // Notification management
        removeNotification,
        clearNotifications
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
