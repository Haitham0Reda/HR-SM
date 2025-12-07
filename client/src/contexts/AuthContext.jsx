import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Configure axios defaults
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Load user on mount
    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                try {
                    const response = await axios.get('/api/v1/hr-core/auth/me');
                    setUser(response.data.data);
                } catch (error) {
                    console.error('Failed to load user:', error);
                    logout();
                }
            }
            setLoading(false);
        };

        loadUser();
    }, [token]);

    const login = async (email, password, tenantId) => {
        try {
            const response = await axios.post('/api/v1/hr-core/auth/login', {
                email,
                password,
                tenantId
            });

            const { user, token } = response.data.data;

            setUser(user);
            setToken(token);
            localStorage.setItem('token', token);

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
            await axios.post('/api/v1/hr-core/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setToken(null);
            localStorage.removeItem('token');
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
        token,
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
