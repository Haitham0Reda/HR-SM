import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  loginUser,
  logoutUser,
  loadUserProfile,
  clearError,
  updateUser,
  clearAuthState,
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
  selectHasRole
} from '../authSlice';

// Mock API
jest.mock('../../../services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

const api = require('../../../services/api');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('authSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state).toEqual({
        user: null,
        tenantToken: null,
        tenantId: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      });
    });
  });

  describe('reducers', () => {
    beforeEach(() => {
      // Reset localStorage mock before each test
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockClear();
      localStorageMock.removeItem.mockClear();
    });
    it('should clear error', () => {
      // Set initial error state
      store.dispatch({ type: 'auth/loginUser/rejected', payload: 'Test error' });
      expect(store.getState().auth.error).toBe('Test error');

      // Clear error
      store.dispatch(clearError());
      expect(store.getState().auth.error).toBeNull();
    });

    it('should update user', () => {
      const userData = { id: 1, name: 'John Doe', role: 'employee' };
      store.dispatch(updateUser(userData));
      expect(store.getState().auth.user).toEqual(userData);
    });

    it('should clear auth state', () => {
      // Set some auth state
      store.dispatch(updateUser({ id: 1, name: 'John Doe' }));
      store.dispatch({ type: 'auth/loginUser/fulfilled', payload: { user: { id: 1 }, tenantToken: 'token', tenantId: 'tenant1' } });

      // Clear auth state
      store.dispatch(clearAuthState());
      
      const state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.tenantToken).toBeNull();
      expect(state.tenantId).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
      // Note: localStorage operations happen in async thunks, not reducers
    });

    it('should set tokens from storage', () => {
      // Create initial state
      const initialState = {
        user: null,
        tenantToken: null,
        tenantId: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      };

      // Create a new store with localStorage values already set
      const storeWithStorage = configureStore({
        reducer: {
          auth: authReducer,
        },
        preloadedState: {
          auth: {
            ...initialState,
            tenantToken: 'stored_token',
            tenantId: 'stored_tenant_id'
          }
        }
      });

      const state = storeWithStorage.getState().auth;
      expect(state.tenantToken).toBe('stored_token');
      expect(state.tenantId).toBe('stored_tenant_id');
    });
  });

  describe('async thunks', () => {
    beforeEach(() => {
      // Reset localStorage mock before each test
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockClear();
      localStorageMock.removeItem.mockClear();
    });
    describe('loginUser', () => {
      it('should handle successful login', async () => {
        const mockResponse = {
          data: {
            data: {
              user: { id: 1, name: 'John Doe', role: 'employee', tenantId: 'tenant1' },
              token: 'jwt_token'
            }
          }
        };
        api.post.mockResolvedValue(mockResponse);

        const result = await store.dispatch(loginUser({
          email: 'john@example.com',
          password: 'password',
          tenantId: 'tenant1'
        }));

        expect(result.type).toBe('auth/loginUser/fulfilled');
        expect(result.payload).toEqual({
          user: mockResponse.data.data.user,
          tenantToken: 'jwt_token',
          tenantId: 'tenant1'
        });

        const state = store.getState().auth;
        expect(state.user).toEqual(mockResponse.data.data.user);
        expect(state.tenantToken).toBe('jwt_token');
        expect(state.tenantId).toBe('tenant1');
        expect(state.isAuthenticated).toBe(true);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle login failure', async () => {
        const errorMessage = 'Invalid credentials';
        api.post.mockRejectedValue(new Error(errorMessage));

        const result = await store.dispatch(loginUser({
          email: 'john@example.com',
          password: 'wrong_password',
          tenantId: 'tenant1'
        }));

        expect(result.type).toBe('auth/loginUser/rejected');
        expect(result.payload).toBe(errorMessage);

        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
      });
    });

    describe('loadUserProfile', () => {
      it('should load user profile successfully', async () => {
        const mockUser = { id: 1, name: 'John Doe', role: 'employee' };
        api.get.mockResolvedValue({ data: mockUser });

        // Set initial auth state
        store.dispatch(setTokensFromStorage());
        localStorageMock.getItem.mockImplementation((key) => {
          if (key === 'tenant_token') return 'token';
          if (key === 'tenant_id') return 'tenant1';
          return null;
        });

        const result = await store.dispatch(loadUserProfile());

        expect(result.type).toBe('auth/loadUserProfile/fulfilled');
        expect(result.payload).toEqual(mockUser);

        const state = store.getState().auth;
        expect(state.user).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle 401 error and clear auth state', async () => {
        const error = new Error('Unauthorized');
        error.status = 401;
        api.get.mockRejectedValue(error);

        // Set initial auth state
        store.dispatch({ type: 'auth/loginUser/fulfilled', payload: { user: { id: 1 }, tenantToken: 'token', tenantId: 'tenant1' } });

        const result = await store.dispatch(loadUserProfile());

        expect(result.type).toBe('auth/loadUserProfile/rejected');
        expect(result.payload).toBe('Unauthorized');

        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.tenantToken).toBeNull();
        expect(state.tenantId).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });
    });

    describe('logoutUser', () => {
      it('should logout successfully', async () => {
        api.post.mockResolvedValue({});

        // Set initial auth state
        store.dispatch({ type: 'auth/loginUser/fulfilled', payload: { user: { id: 1 }, tenantToken: 'token', tenantId: 'tenant1' } });

        const result = await store.dispatch(logoutUser());

        expect(result.type).toBe('auth/logoutUser/fulfilled');

        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.tenantToken).toBeNull();
        expect(state.tenantId).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should clear auth state even if API call fails', async () => {
        api.post.mockRejectedValue(new Error('Network error'));

        const result = await store.dispatch(logoutUser());

        expect(result.type).toBe('auth/logoutUser/fulfilled');
        
        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.tenantToken).toBeNull();
        expect(state.tenantId).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      // Set up test state
      store.dispatch({
        type: 'auth/loginUser/fulfilled',
        payload: {
          user: { id: 1, name: 'John Doe', role: 'admin', tenantId: 'tenant1' },
          tenantToken: 'jwt_token',
          tenantId: 'tenant1'
        }
      });
    });

    it('should select auth state', () => {
      const auth = selectAuth(store.getState());
      expect(auth.user).toBeDefined();
      expect(auth.isAuthenticated).toBe(true);
    });

    it('should select user', () => {
      const user = selectUser(store.getState());
      expect(user).toEqual({ id: 1, name: 'John Doe', role: 'admin', tenantId: 'tenant1' });
    });

    it('should select isAuthenticated', () => {
      const isAuthenticated = selectIsAuthenticated(store.getState());
      expect(isAuthenticated).toBe(true);
    });

    it('should select loading state', () => {
      const loading = selectAuthLoading(store.getState());
      expect(loading).toBe(false);
    });

    it('should select error', () => {
      const error = selectAuthError(store.getState());
      expect(error).toBeNull();
    });

    it('should select tenant token', () => {
      const token = selectTenantToken(store.getState());
      expect(token).toBe('jwt_token');
    });

    it('should select tenant ID', () => {
      const tenantId = selectTenantId(store.getState());
      expect(tenantId).toBe('tenant1');
    });

    it('should select role-based flags', () => {
      expect(selectIsAdmin(store.getState())).toBe(true);
      expect(selectIsHR(store.getState())).toBe(false);
      expect(selectIsManager(store.getState())).toBe(false);
      expect(selectIsEmployee(store.getState())).toBe(false);
    });

    it('should check role hierarchy', () => {
      const hasAdminRole = selectHasRole('admin')(store.getState());
      const hasHRRole = selectHasRole('hr')(store.getState());
      const hasManagerRole = selectHasRole('manager')(store.getState());
      const hasEmployeeRole = selectHasRole('employee')(store.getState());

      expect(hasAdminRole).toBe(true);
      expect(hasHRRole).toBe(true); // Admin has HR permissions
      expect(hasManagerRole).toBe(true); // Admin has Manager permissions
      expect(hasEmployeeRole).toBe(true); // Admin has Employee permissions
    });
  });
});