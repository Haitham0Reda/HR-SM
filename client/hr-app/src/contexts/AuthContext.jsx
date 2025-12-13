import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tenantToken, setTenantToken] = useState(localStorage.getItem('tenant_token'));
    const [tenantId, setTenantId] = useState(localStorage.getItem('tenant_id'));

    // Configure axios defaults for Tenant API
    useEffect(() => {
        // Token is handled automatically by the api interceptor
        // No need to manually set headers
    }, [tenantToken]);

    // Load user on mount
    useEffect(() => {
        const loadUser = async () => {
            if (tenantToken && tenantId) {
                try {
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Failed to load user:', error);
                    // Clear local state without making API call
                    clearAuthState();
                }
            }
            setLoading(false);
        };

        loadUser();
    }, [tenantToken, tenantId]);

    const login = async (email, password, tenantIdInput) => {
        try {
            const response = await api.post('/auth/login', {
                email,
                password,
                tenantId: tenantIdInput
            });

            const { user, token } = response.data;

            setUser(user);
            setTenantToken(token);
            setTenantId(user.tenantId || tenantIdInput);
            
            // Store Tenant JWT and tenant ID
            localStorage.setItem('tenant_token', token);
            localStorage.setItem('tenant_id', user.tenantId || tenantIdInput);
            
            // Remove old token if exists
            localStorage.removeItem('token');

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.message || error.data?.message || 'Login failed'
            };
        }
    };

    const clearAuthState = () => {
        setUser(null);
        setTenantToken(null);
        setTenantId(null);
        localStorage.removeItem('tenant_token');
        localStorage.removeItem('tenant_id');
        localStorage.removeItem('token'); // Remove old token if exists
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuthState();
        }
    };

    const hasRole = (requiredRole) => {
        if (!user) return false;

        const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
        const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;

        return userRoleLevel >= requiredRoleLevel;
    };

    const updateUser = (updatedUserData) => {
        setUser(updatedUserData);
    };

    const value = {
        user,
        token: tenantToken, // Expose as 'token' for backward compatibility
        tenantToken,
        tenantId,
        loading,
        login,
        logout,
        hasRole,
        updateUser,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

const ROLE_HIERARCHY = {
    'admin': 4,
    'hr': 3,
    'manager': 2,
    'employee': 1
};
