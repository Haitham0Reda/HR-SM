import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);

            // Fetch fresh profile data to ensure we have latest info including profile picture
            authService.getProfile()
                .then(profileData => {
                    if (profileData) {
                        setUser(profileData);
                        localStorage.setItem('user', JSON.stringify(profileData));
                    }
                })
                .catch(error => {
                    console.error('Failed to fetch profile on mount:', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        setUser(response.user);

        // Fetch fresh user profile to ensure we have all data including profile picture
        try {
            const profileData = await authService.getProfile();
            if (profileData) {
                setUser(profileData);
                localStorage.setItem('user', JSON.stringify(profileData));
            }
        } catch (error) {
            console.error('Failed to fetch profile after login:', error);
        }

        return response;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const value = {
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isHR: user?.role === 'hr' || user?.role === 'admin',
        isManager: user?.role === 'manager' || user?.role === 'hr' || user?.role === 'admin',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
