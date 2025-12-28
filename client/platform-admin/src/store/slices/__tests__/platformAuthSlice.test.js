import { configureStore } from '@reduxjs/toolkit';
import platformAuthSlice, {
  loginAsync,
  logoutAsync,
  checkAuthAsync,
  clearError,
  setUser,
} from '../platformAuthSlice';

// Mock the platformApi
jest.mock('../../../services/platformApi', () => ({
  post: jest.fn(),
  get: jest.fn(),
  defaults: {
    headers: {
      common: {},
    },
  },
}));

// Mock SecureLS
const mockLS = {
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
};

jest.mock('secure-ls', () => {
  return jest.fn(() => mockLS);
});

import platformApi from '../../../services/platformApi';

describe('platformAuthSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        platformAuth: platformAuthSlice,
      },
    });
    
    // Reset mocks
    jest.clearAllMocks();
    mockLS.set.mockClear();
    mockLS.get.mockClear();
    mockLS.remove.mockClear();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().platformAuth;
      expect(state).toEqual({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        lastSuccessfulOperation: null,
      });
    });
  });

  describe('reducers', () => {
    it('should handle clearError', () => {
      // Set an error first
      store.dispatch({
        type: 'platformAuth/loginAsync/rejected',
        payload: 'Test error',
      });
      
      // Clear the error
      store.dispatch(clearError());
      
      const state = store.getState().platformAuth;
      expect(state.error).toBeNull();
    });

    it('should handle setUser', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test User' };
      
      store.dispatch(setUser(user));
      
      const state = store.getState().platformAuth;
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle setUser with null', () => {
      store.dispatch(setUser(null));
      
      const state = store.getState().platformAuth;
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('loginAsync', () => {
    it('should handle successful login', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      const mockToken = 'mock-token';
      
      platformApi.post.mockResolvedValueOnce({
        data: {
          data: {
            token: mockToken,
            user: mockUser,
          },
        },
      });

      await store.dispatch(loginAsync({ email: 'test@example.com', password: 'password' }));

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
      expect(mockLS.set).toHaveBeenCalledWith('platformToken', mockToken);
    });

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials';
      
      platformApi.post.mockRejectedValueOnce({
        response: {
          data: {
            message: errorMessage,
          },
        },
      });

      await store.dispatch(loginAsync({ email: 'test@example.com', password: 'wrong' }));

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toEqual({
        message: errorMessage,
        code: 'LOGIN_FAILED',
        timestamp: expect.any(String),
        retryable: true,
      });
    });

    it('should handle rate limiting', async () => {
      platformApi.post.mockRejectedValueOnce({
        response: {
          status: 429,
        },
      });

      await store.dispatch(loginAsync({ email: 'test@example.com', password: 'password' }));

      const state = store.getState().platformAuth;
      expect(state.error.message).toBe('Too many login attempts. Please wait a moment and try again.');
    });
  });

  describe('logoutAsync', () => {
    it('should handle successful logout', async () => {
      // Set initial authenticated state
      store.dispatch(setUser({ id: '1', email: 'test@example.com' }));
      
      platformApi.post.mockResolvedValueOnce({});

      await store.dispatch(logoutAsync());

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      expect(mockLS.remove).toHaveBeenCalledWith('platformToken');
    });

    it('should handle logout even if API call fails', async () => {
      // Set initial authenticated state
      store.dispatch(setUser({ id: '1', email: 'test@example.com' }));
      
      platformApi.post.mockRejectedValueOnce(new Error('Network error'));

      await store.dispatch(logoutAsync());

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull(); // Should not show error on logout failure
      expect(mockLS.remove).toHaveBeenCalledWith('platformToken');
    });
  });

  describe('checkAuthAsync', () => {
    it('should handle successful auth check', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      const mockToken = 'mock-token';
      
      mockLS.get.mockReturnValueOnce(mockToken);
      platformApi.get.mockResolvedValueOnce({
        data: {
          data: {
            user: mockUser,
          },
        },
      });

      await store.dispatch(checkAuthAsync());

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle no token found', async () => {
      mockLS.get.mockReturnValueOnce(null);

      await store.dispatch(checkAuthAsync());

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toEqual({
        message: 'No token found',
        code: 'AUTH_CHECK_FAILED',
        timestamp: expect.any(String),
        retryable: false,
      });
    });

    it('should handle rate limiting gracefully', async () => {
      const mockToken = 'mock-token';
      
      mockLS.get.mockReturnValueOnce(mockToken);
      platformApi.get.mockRejectedValueOnce({
        response: {
          status: 429,
        },
      });

      await store.dispatch(checkAuthAsync());

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      // Rate limiting should not set an error
      expect(state.error).toBeNull();
    });

    it('should handle invalid token', async () => {
      const mockToken = 'invalid-token';
      
      mockLS.get.mockReturnValueOnce(mockToken);
      platformApi.get.mockRejectedValueOnce({
        response: {
          status: 401,
        },
      });

      await store.dispatch(checkAuthAsync());

      const state = store.getState().platformAuth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(mockLS.remove).toHaveBeenCalledWith('platformToken');
    });
  });
});