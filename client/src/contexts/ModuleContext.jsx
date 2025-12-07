import React, { createContext, useContext, useState, useEffect } from 'react';
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
    const [enabledModules, setEnabledModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const loadModules = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get('/api/v1/hr-core/tenant/modules');
                const modules = response.data.data.map(m => m.name);
                setEnabledModules(modules);
            } catch (error) {
                console.error('Failed to load modules:', error);
            } finally {
                setLoading(false);
            }
        };

        loadModules();
    }, [isAuthenticated]);

    const isModuleEnabled = (moduleName) => {
        // HR Core is always enabled
        if (moduleName === 'hr-core') return true;
        return enabledModules.includes(moduleName);
    };

    const refreshModules = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/hr-core/tenant/modules');
            const modules = response.data.data.map(m => m.name);
            setEnabledModules(modules);
        } catch (error) {
            console.error('Failed to refresh modules:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        enabledModules,
        loading,
        isModuleEnabled,
        refreshModules
    };

    return (
        <ModuleContext.Provider value={value}>
            {children}
        </ModuleContext.Provider>
    );
};
