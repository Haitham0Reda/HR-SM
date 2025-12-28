# Redux Implementation Guide - HR-SM Modernization

## Overview

This document provides comprehensive documentation for the Redux Toolkit implementation in the HR-SM platform, covering both the HR Application and Platform Admin interfaces.

## Architecture

### Store Structure

#### HR Application Store (`client/hr-app/src/store/`)

```
store/
├── index.js                    # Store configuration with persist middleware
├── slices/
│   ├── authSlice.js           # Authentication state management
│   ├── tenantSlice.js         # Multi-tenant context and switching
│   ├── moduleSlice.js         # Feature flags and enabled modules
│   └── notificationSlice.js   # Toast messages and alerts
├── providers/
│   ├── ReduxAuthProvider.jsx      # Auth context compatibility layer
│   ├── ReduxModuleProvider.jsx    # Module context compatibility layer
│   └── ReduxNotificationProvider.jsx # Notification context compatibility layer
└── hooks/
    ├── useAppDispatch.js      # Typed dispatch hook
    └── useAppSelector.js      # Typed selector hook
```

#### Platform Admin Store (`client/platform-admin/src/store/`)

```
store/
├── index.js                        # Store configuration with persist middleware
├── slices/
│   ├── platformAuthSlice.js        # Platform admin authentication
│   ├── tenantManagementSlice.js    # Tenant CRUD operations with async thunks
│   ├── subscriptionSlice.js        # Subscription lifecycle management
│   ├── moduleManagementSlice.js    # Module configuration
│   └── systemSettingsSlice.js     # Platform settings and health monitoring
├── providers/
│   └── ReduxPlatformAuthProvider.jsx # Platform auth compatibility layer
└── hooks/
    ├── useAppDispatch.js           # Typed dispatch hook
    └── useAppSelector.js           # Typed selector hook
```

## Redux Toolkit Patterns

### 1. Slice Structure

All slices follow a consistent pattern:

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Initial state with proper typing
const initialState = {
  data: null,
  loading: false,
  error: null,
  lastSuccessfulOperation: null,
};

// Async thunks for API operations
export const fetchDataAsync = createAsyncThunk(
  'sliceName/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get('/endpoint');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Operation failed');
    }
  }
);

// Slice definition
const sliceNameSlice = createSlice({
  name: 'sliceName',
  initialState,
  reducers: {
    // Synchronous actions
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDataAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDataAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
        state.lastSuccessfulOperation = new Date().toISOString();
      })
      .addCase(fetchDataAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = {
          message: action.payload,
          code: 'FETCH_FAILED',
          timestamp: new Date().toISOString(),
          retryable: true,
        };
      });
  },
});

// Export selectors
export const selectData = (state) => state.sliceName.data;
export const selectLoading = (state) => state.sliceName.loading;
export const selectError = (state) => state.sliceName.error;

// Export actions and reducer
export const { clearError } = sliceNameSlice.actions;
export default sliceNameSlice.reducer;
```

### 2. Async Thunk Conventions

#### Error Handling Pattern

```javascript
export const operationAsync = createAsyncThunk(
  'slice/operation',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.operation(params);
      return response.data;
    } catch (error) {
      console.error('Operation failed:', error);
      return rejectWithValue(error.response?.data?.message || 'Operation failed');
    }
  }
);
```

#### Structured Error State

```javascript
state.error = {
  message: string,           // User-friendly error message
  code: string,             // Error code for programmatic handling
  timestamp: string,        // ISO timestamp of error
  retryable: boolean,       // Whether operation can be retried
};
```

### 3. Persistence Configuration

#### HR Application Persistence

```javascript
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'tenant'], // Only persist auth and tenant state
};
```

#### Platform Admin Persistence

```javascript
const persistConfig = {
  key: 'platform-admin-root',
  storage,
  whitelist: ['platformAuth', 'systemSettings'], // Only persist auth and settings
};
```

### 4. Middleware Configuration

```javascript
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});
```

## State Management Patterns

### 1. Authentication State (HR App)

```javascript
// State structure
{
  user: User | null,
  isAuthenticated: boolean,
  loading: boolean,
  error: ErrorState | null,
  tenantToken: string | null,
  tenantId: string | null,
}

// Key selectors
selectUser(state)
selectIsAuthenticated(state)
selectTenantToken(state)
selectIsAdmin(state)
selectIsHR(state)
selectIsManager(state)
selectIsEmployee(state)
```

### 2. Multi-Tenant State

```javascript
// State structure
{
  currentTenant: Tenant | null,
  availableTenants: Tenant[],
  switching: boolean,
  loading: boolean,
  error: ErrorState | null,
  companySlug: string | null,
}

// Key operations
dispatch(loadTenantInfo())
dispatch(switchTenant(tenantId))
dispatch(setCurrentTenant(tenant))
```

### 3. Platform Admin State

```javascript
// Tenant Management State
{
  tenants: Tenant[],
  currentTenant: Tenant | null,
  loading: boolean,
  error: ErrorState | null,
  pagination: PaginationState,
  filters: FilterState,
}

// Key operations
dispatch(fetchTenantsAsync({ page, limit, search }))
dispatch(createTenantAsync(tenantData))
dispatch(updateTenantAsync({ tenantId, tenantData }))
dispatch(deleteTenantAsync(tenantId))
```

## Component Integration Patterns

### 1. Using Redux in Components

```javascript
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectUser, selectLoading, loginAsync } from '../store/slices/authSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const loading = useAppSelector(selectLoading);

  const handleLogin = async (credentials) => {
    try {
      await dispatch(loginAsync(credentials)).unwrap();
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    // Component JSX
  );
};
```

### 2. Backward Compatibility Providers

The Redux providers maintain the same interface as the original Context providers:

```javascript
// Original Context usage still works
const { user, login, logout } = useAuth();
const { currentTenant, switchTenant } = useTenant();
const { showNotification } = useNotification();
```

## Testing Patterns

### 1. Slice Testing

```javascript
import { configureStore } from '@reduxjs/toolkit';
import sliceReducer, { actionName } from './sliceFile';

describe('Slice Tests', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: { slice: sliceReducer },
    });
  });

  it('should handle action', () => {
    store.dispatch(actionName(payload));
    const state = store.getState().slice;
    expect(state.property).toBe(expectedValue);
  });
});
```

### 2. Async Thunk Testing

```javascript
import { fetchDataAsync } from './sliceFile';

describe('Async Thunk Tests', () => {
  it('should handle successful fetch', async () => {
    const mockResponse = { data: 'test' };
    api.get.mockResolvedValue(mockResponse);

    const result = await store.dispatch(fetchDataAsync());
    expect(result.type).toBe('slice/fetchData/fulfilled');
    expect(result.payload).toBe(mockResponse.data);
  });
});
```

## Performance Optimizations

### 1. Selector Memoization

```javascript
import { createSelector } from '@reduxjs/toolkit';

export const selectFilteredTenants = createSelector(
  [selectTenants, selectFilters],
  (tenants, filters) => {
    return tenants.filter(tenant => 
      tenant.name.toLowerCase().includes(filters.search.toLowerCase())
    );
  }
);
```

### 2. Component Optimization

```javascript
import { memo } from 'react';

const OptimizedComponent = memo(({ data }) => {
  // Component implementation
});
```

## DevTools Integration

### 1. Redux DevTools Configuration

```javascript
devTools: process.env.NODE_ENV !== 'production'
```

### 2. Time Travel Debugging

- Use Redux DevTools to inspect state changes
- Jump to any previous state
- Replay actions for debugging

### 3. Action Monitoring

- Monitor dispatched actions in real-time
- Inspect action payloads
- Track async thunk lifecycle

## Migration Guidelines

### 1. From Context to Redux

1. **Identify Context Usage**: Find all `useContext` calls
2. **Map to Redux Selectors**: Replace with `useAppSelector`
3. **Replace Context Actions**: Use `useAppDispatch` with action creators
4. **Update Providers**: Wrap with Redux providers
5. **Test Thoroughly**: Ensure all functionality works

### 2. Maintaining Backward Compatibility

- Keep existing hook interfaces
- Provide compatibility providers
- Gradually migrate components
- Maintain feature parity

## Best Practices

### 1. State Structure

- Keep state normalized
- Avoid deeply nested objects
- Use consistent naming conventions
- Include loading and error states

### 2. Action Naming

- Use descriptive action names
- Follow consistent patterns
- Include entity and operation
- Use async suffix for thunks

### 3. Error Handling

- Always handle async errors
- Provide user-friendly messages
- Include retry mechanisms
- Log errors for debugging

### 4. Performance

- Use selectors for computed values
- Memoize expensive selectors
- Avoid unnecessary re-renders
- Keep components focused

## Troubleshooting

### 1. Common Issues

**Persist Rehydration Errors**
```javascript
// Ensure proper serialization
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
    },
  })
```

**Async Thunk Errors**
```javascript
// Always use try-catch in thunks
try {
  const response = await api.call();
  return response.data;
} catch (error) {
  return rejectWithValue(error.message);
}
```

### 2. Debugging Tips

- Use Redux DevTools for state inspection
- Add console.log in reducers (development only)
- Check network requests in browser DevTools
- Verify action dispatching with DevTools

## Conclusion

The Redux Toolkit implementation provides:

- **Predictable State Management**: Centralized state with clear data flow
- **Developer Experience**: Excellent debugging tools and patterns
- **Performance**: Optimized re-renders and state updates
- **Maintainability**: Consistent patterns and structure
- **Backward Compatibility**: Smooth migration from Context API

This implementation successfully modernizes the HR-SM platform's state management while maintaining all existing functionality and providing a foundation for future enhancements.