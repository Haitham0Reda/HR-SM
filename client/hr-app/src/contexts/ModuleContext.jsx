/**
 * Module Context
 * 
 * Manages enabled modules for the current tenant.
 * Fetches module configuration on login and provides module status checks.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import axios from 'axios';
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
    const { isAuthenticated, companySlug, user } = useAuth();
    const [enabledModules, setEnabledModules] = useState([]);
    const [moduleDetails, setModuleDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch enabled modules when user logs in
    useEffect(() => {
        const fetchEnabledModules = async () => {
            if (!companySlug) {
                setEnabledModules([]);
                setModuleDetails({});
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log('Fetching modules for company:', companySlug);

                // Use the platform API to get company modules
                const baseURL = process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
                const response = await axios.get(`${baseURL}/api/platform/companies/${companySlug}/modules`);
                
                if (response.data.success) {
                    const modules = response.data.data.availableModules || {};
                    
                    // Extract enabled module names
                    const enabledModulesList = Object.entries(modules)
                        .filter(([key, module]) => module.enabled)
                        .map(([key]) => key);
                    
                    console.log('Enabled modules loaded:', enabledModulesList);
                    
                    setEnabledModules(enabledModulesList);
                    setModuleDetails(modules);
                } else {
                    throw new Error(response.data.message || 'Failed to load modules');
                }
            } catch (err) {
                console.error('Failed to fetch enabled modules:', err);
                
                // In development, provide default enabled modules
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Using default module configuration for development');
                    setEnabledModules(['hr-core', 'attendance', 'leave', 'documents', 'reports', 'tasks']);
                } else {
                    setError(err.message || 'Failed to load modules');
                    setEnabledModules(['hr-core']);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchEnabledModules();
    }, [companySlug]);

    /**
     * Check if a module is enabled for the current tenant
     * @param {string} moduleId - Module identifier (e.g., 'tasks', 'email-service')
     * @returns {boolean} - Whether the module is enabled
     */
    const isModuleEnabled = (moduleId) => {
        // Admin users have access to all modules
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
            const allModules = Object.keys(moduleDetails);
            return allModules.length > 0 ? allModules : ['hr-core', 'attendance', 'leave', 'payroll', 'documents', 'reports', 'tasks', 'surveys', 'announcements', 'events'];
        }
        
        return ['hr-core', ...enabledModules];
    };

    const value = {
        enabledModules: getEnabledModules(),
        moduleDetails,
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
