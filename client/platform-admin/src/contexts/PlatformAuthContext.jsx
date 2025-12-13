import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import platformApi from '../services/platformApi';
import SecureLS from 'secure-ls';

const PlatformAuthContext = createContext(null);

// Secure local storage for platform tokens
const ls = new SecureLS({ encodingType: 'aes' });

export const PlatformAuthProvider = ({ children }) => {
  const [platformUser, setPlatformUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing platform token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = ls.get('platformToken');
        if (token) {
          // Set token in API client
          platformApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token and get platform user info
          const response = await platformApi.get('/auth/me');
          setPlatformUser(response.data.data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        
        // Handle rate limiting gracefully
        if (error.response?.status === 429) {
          console.warn('Rate limited during auth check - will retry later');
          // Don't clear token on rate limit, just set loading to false
        } else {
          // Clear invalid token for other errors
          ls.remove('platformToken');
          delete platformApi.defaults.headers.common['Authorization'];
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', email);
      const response = await platformApi.post('/auth/login', {
        email,
        password,
      });

      console.log('Login response:', response.data);
      const { token, user } = response.data.data;

      // Store token securely
      ls.set('platformToken', token);

      // Set token in API client
      platformApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Set platform user
      setPlatformUser(user);

      console.log('Login successful for user:', user.email);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Login failed';
      if (error.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again.';
      } else {
        errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Login failed';
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = async () => {
    try {
      await platformApi.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token and user
      ls.remove('platformToken');
      delete platformApi.defaults.headers.common['Authorization'];
      setPlatformUser(null);
      navigate('/login');
    }
  };

  const value = {
    platformUser,
    loading,
    login,
    logout,
    isAuthenticated: !!platformUser,
  };

  return (
    <PlatformAuthContext.Provider value={value}>
      {children}
    </PlatformAuthContext.Provider>
  );
};

export const usePlatformAuth = () => {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error('usePlatformAuth must be used within PlatformAuthProvider');
  }
  return context;
};

export default PlatformAuthContext;
