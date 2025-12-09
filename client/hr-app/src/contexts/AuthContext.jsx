import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// API Base URL - Tenant API namespace
const TENANT_API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

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
        if (tenantToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${tenantToken}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [tenantToken]);

    // Load user on mount
    useEffect(() => {
        const loadUser = async () => {
            if (tenantToken && tenantId) {
                try {
                    const response = await axios.get(`${TENANT_API_BASE}/hr-core/auth/me`);
                    setUser(response.data.data);
                } catch (error) {
                    console.error('Failed to load user:', error);
                    logout();
                }
            }
            setLoading(false);
        };

        loadUser();
    }, [tenantToken, tenantId]);

    const login = async (email, password, tenantIdInput) => {
        try {
            const response = await axios.post(`${TENANT_API_BASE}/hr-core/auth/login`, {
                email,
                password,
                tenantId: tenantIdInput
            });

            const { user, token } = response.data.data;

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
                message: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const logout = async () => {
        try {
            await axios.post(`${TENANT_API_BASE}/hr-core/auth/logout`);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setTenantToken(null);
            setTenantId(null);
            localStorage.removeItem('tenant_token');
            localStorage.removeItem('tenant_id');
            localStorage.removeItem('token'); // Remove old token if exists
        }
    };

    const hasRole = (requiredRole) => {
        if (!user) return false;

        const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
        const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;

        return userRoleLevel >= requiredRoleLevel;
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
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

const ROLE_HIERARCHY = {
    'Admin': 4,
    'HR': 3,
    'Manager': 2,
    'Employee': 1
};
