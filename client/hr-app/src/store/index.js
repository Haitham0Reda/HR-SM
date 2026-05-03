import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import authSlice from './slices/authSlice';
import tenantSlice from './slices/tenantSlice';
import moduleSlice from './slices/moduleSlice';
import notificationSlice from './slices/notificationSlice';
import uiSlice from './slices/uiSlice';

// Import RTK Query API
import { baseApi } from './api';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'tenant', 'ui'], // Persist auth, tenant, and ui (for theme)
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  tenant: tenantSlice,
  modules: moduleSlice,
  notifications: notificationSlice,
  ui: uiSlice,
  [baseApi.reducerPath]: baseApi.reducer, // Add RTK Query API reducer
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore all redux-persist actions to prevent non-serializable warnings.
        // redux-persist dispatches: FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware), // Add RTK Query middleware
  devTools: process.env.NODE_ENV !== 'production', // Enable Redux DevTools only in development
});

// Create persistor
export const persistor = persistStore(store);