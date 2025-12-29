import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks';
import { checkAuthAsync, logoutAsync, loginAsync } from '../slices/platformAuthSlice';

// Redux-based Platform Auth Provider that maintains the same interface as the original context
export const ReduxPlatformAuthProvider = ({ children }) => {
  const dispatch = useAppDispatch();

  // Check for existing platform token on mount
  useEffect(() => {
    dispatch(checkAuthAsync());
  }, [dispatch]);

  // This provider doesn't render anything - it just initializes auth state
  // The actual auth state is accessed through Redux selectors
  return children;
};

// Custom hook that provides the same interface as the original usePlatformAuth
export const usePlatformAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error } = useAppSelector(state => state.platformAuth);

  const login = async (email, password) => {
    try {
      await dispatch(loginAsync({ email, password })).unwrap();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error,
      };
    }
  };

  const logout = async () => {
    await dispatch(logoutAsync());
    navigate('/login');
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    error
  };
};

export default ReduxPlatformAuthProvider;