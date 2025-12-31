import React, { useEffect, createContext, useContext } from 'react';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import {
  loginUser,
  logoutUser,
  loadUserProfile,
  setTokensFromStorage,
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectTenantToken,
  selectTenantId,
  selectIsAdmin,
  selectIsHR,
  selectIsManager,
  selectIsEmployee,
  selectHasRole,
  updateUser as updateUserAction
} from '../slices/authSlice';
import {
  loadTenantInfo,
  selectCurrentTenant,
  selectCompanySlug
} from '../slices/tenantSlice';

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  'employee': 1,
  'manager': 2,
  'hr': 3,
  'admin': 4
};

// Create a context for backward compatibility
const ReduxAuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(ReduxAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within ReduxAuthProvider');
  }
  return context;
};

export const ReduxAuthProvider = ({ children }) => {
  const dispatch = useAppDispatch();
  
  // Auth selectors
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const tenantToken = useAppSelector(selectTenantToken);
  const tenantId = useAppSelector(selectTenantId);
  
  // Role selectors
  const isAdmin = useAppSelector(selectIsAdmin);
  const isHR = useAppSelector(selectIsHR);
  const isManager = useAppSelector(selectIsManager);
  const isEmployee = useAppSelector(selectIsEmployee);
  
  // Tenant selectors
  const tenant = useAppSelector(selectCurrentTenant);
  const companySlug = useAppSelector(selectCompanySlug);

  // Load user and tenant info on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Set tokens from localStorage first
      dispatch(setTokensFromStorage());
      
      const storedToken = localStorage.getItem('tenant_token');
      const storedTenantId = localStorage.getItem('tenant_id');
      
      if (storedToken && storedTenantId) {
        try {
          // Load user profile
          await dispatch(loadUserProfile()).unwrap();
          
          // Load tenant info
          try {
            await dispatch(loadTenantInfo()).unwrap();
          } catch (tenantError) {
            console.warn('Failed to load tenant info, using fallback');
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
        }
      } else if (process.env.NODE_ENV === 'development') {
        // Auto-login in development if no token exists
        try {
          console.log('🔧 Development mode: Attempting auto-login...');
          const response = await fetch('/api/v1/dev/auto-login');
          const data = await response.json();
          
          if (data.success) {
            localStorage.setItem('tenant_token', data.data.token);
            localStorage.setItem('tenant_id', data.data.user.tenantId);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            console.log('✅ Development auto-login successful');
            
            // Reload the page to reinitialize with the new token
            window.location.reload();
          }
        } catch (error) {
          console.warn('⚠️ Development auto-login failed:', error.message);
        }
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Auth functions
  const login = async (email, password, tenantIdInput) => {
    try {
      await dispatch(loginUser({ email, password, tenantId: tenantIdInput })).unwrap();
      
      // Load tenant info after successful login
      try {
        await dispatch(loadTenantInfo()).unwrap();
      } catch (tenantError) {
        console.warn('Failed to load tenant info after login');
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    await dispatch(logoutUser());
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;
    
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  };

  const updateUser = (updatedUserData) => {
    // Use the proper action creator
    dispatch(updateUserAction(updatedUserData));
  };

  // Generate company slug from tenant info (backward compatibility)
  const finalCompanySlug = companySlug || 
                          (tenant?.name ? tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : null) ||
                          'techcorp_solutions';

  const value = {
    user,
    tenant,
    companySlug: finalCompanySlug,
    token: tenantToken, // Expose as 'token' for backward compatibility
    tenantToken,
    tenantId,
    loading,
    error,
    login,
    logout,
    hasRole,
    updateUser,
    isAuthenticated,
    isAdmin,
    isHR,
    isManager,
    isEmployee
  };

  return (
    <ReduxAuthContext.Provider value={value}>
      {children}
    </ReduxAuthContext.Provider>
  );
};