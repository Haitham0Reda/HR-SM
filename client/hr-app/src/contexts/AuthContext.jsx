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
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tenantToken, setTenantToken] = useState(localStorage.getItem('tenant_token'));
    const [tenantId, setTenantId] = useState(localStorage.getItem('tenant_id'));

    // Configure axios defaults for Tenant API
    useEffect(() => {
        // Token is handled automatically by the api interceptor
        // No need to manually set headers
    }, [tenantToken]);

    // Load user and tenant info on mount
    useEffect(() => {
        const loadUserAndTenant = async () => {
            if (tenantToken && tenantId) {
                try {
                    // Load user info
                    const userResponse = await api.get('/auth/me');
                    setUser(userResponse.data);

                    // Load tenant info for company name
                    try {
                        const tenantResponse = await api.get('/tenant/info');
                        // Handle different response formats
                        const tenantData = tenantResponse.data?.tenant || tenantResponse.data || tenantResponse;
                        if (tenantData) {
                            setTenant(tenantData);
                        } else {
                            throw new Error('No tenant data in response');
                        }
                    } catch (tenantError) {
                        console.warn('Failed to load tenant info:', tenantError);
                        // Set basic tenant info from user data
                        setTenant({
                            tenantId: tenantId,
                            name: userResponse.data.company?.name || 'TechCorp Solutions'
                        });
                    }
                } catch (error) {
                    console.error('Failed to load user:', error);
                    console.error('Error details:', {
                        message: error.message,
                        status: error.status,
                        tenantToken: !!tenantToken,
                        tenantId
                    });
                    // Clear auth state for authentication errors (401) or user not found (404)
                    if (error.status === 401 || error.status === 404) {
                        console.log(`${error.status} error - clearing auth state (invalid token or user not found)`);
                        clearAuthState();
                    } else {
                        console.log('Non-auth error - keeping auth state but stopping loading');
                        setLoading(false);
                    }
                }
            }
            setLoading(false);
        };

        loadUserAndTenant();
    }, [tenantToken, tenantId]);

    const login = async (email, password, tenantIdInput) => {
        try {
            const response = await api.post('/auth/login', {
                email,
                password,
                tenantId: tenantIdInput
            });

            // Handle backend response structure: { success: true, data: { user, token } }
            const responseData = response.data || response;
            const { user, token } = responseData.data || responseData;

            setUser(user);
            setTenantToken(token);
            setTenantId(user?.tenantId || tenantIdInput);
            
            // Store Tenant JWT and tenant ID
            localStorage.setItem('tenant_token', token);
            localStorage.setItem('tenant_id', user?.tenantId || tenantIdInput);
            
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
        setTenant(null);
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

    // Generate company slug from tenant info
    const companySlug = tenant?.slug || 
                       (tenant?.name ? tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : null) ||
                       'techcorp_solutions'; // Default fallback

    // Computed role checks
    const isAdmin = user?.role === 'admin';
    const isHR = user?.role === 'hr';
    const isManager = user?.role === 'manager';
    const isEmployee = user?.role === 'employee';

    const value = {
        user,
        tenant,
        companySlug,
        token: tenantToken, // Expose as 'token' for backward compatibility
        tenantToken,
        tenantId,
        loading,
        login,
        logout,
        hasRole,
        updateUser,
        isAuthenticated: !!user,
        isAdmin,
        isHR,
        isManager,
        isEmployee
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
