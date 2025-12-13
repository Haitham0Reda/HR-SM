/**
 * Module Context
 * 
 * Manages enabled modules for the current tenant.
 * Fetches module configuration on login and provides module status checks.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ModuleContext = createContext(null);

export const useModules = () => {
    const context = useContext(ModuleContext);
    if (!context) {
        throw new Error('useModules must be used within ModuleProvider');
    }
    return context;
};

export const ModuleProvider = ({ children }) => {
    const { isAuthenticated, tenantId } = useAuth();
    const [enabledModules, setEnabledModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch enabled modules when user logs in
    useEffect(() => {
        const fetchEnabledModules = async () => {
            if (!isAuthenticated || !tenantId) {
                setEnabledModules([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Fetch tenant configuration to get enabled modules
                const response = await api.get('/tenant/config');
                
                // Extract enabled modules from the config
                const config = response.data || response;
                const enabledModulesList = [];
                
                if (config.modules) {
                    // Handle Map format from MongoDB
                    if (typeof config.modules === 'object') {
                        Object.entries(config.modules).forEach(([moduleId, moduleConfig]) => {
                            if (moduleConfig.enabled) {
                                enabledModulesList.push(moduleId);
                            }
                        });
                    }
                }
                
                setEnabledModules(enabledModulesList);
            } catch (err) {
                console.error('Failed to fetch enabled modules:', err);
                
                // In development, provide default enabled modules
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Using default module configuration for development');
                    setEnabledModules(['hr-core', 'tasks']);
                } else {
                    setError(err.message || 'Failed to load modules');
                    setEnabledModules(['hr-core']);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchEnabledModules();
    }, [isAuthenticated, tenantId]);

    /**
     * Check if a module is enabled for the current tenant
     * @param {string} moduleId - Module identifier (e.g., 'tasks', 'email-service')
     * @returns {boolean} - Whether the module is enabled
     */
    const isModuleEnabled = (moduleId) => {
        // HR-Core is always enabled
        if (moduleId === 'hr-core') {
            return true;
        }

        return enabledModules.includes(moduleId);
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
        return ['hr-core', ...enabledModules];
    };

    const value = {
        enabledModules: getEnabledModules(),
        loading,
        error,
        isModuleEnabled,
        areModulesEnabled,
        isAnyModuleEnabled,
    };

    return (
        <ModuleContext.Provider value={value}>
            {children}
        </ModuleContext.Provider>
    );
};

export default ModuleContext;
