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
import platformAuthSlice from './slices/platformAuthSlice';
import tenantManagementSlice from './slices/tenantManagementSlice';
import subscriptionSlice from './slices/subscriptionSlice';
import moduleManagementSlice from './slices/moduleManagementSlice';
import systemSettingsSlice from './slices/systemSettingsSlice';
import licenseManagementSlice from './slices/licenseManagementSlice';

// Import RTK Query API
import { baseApi } from './api';

// Combine reducers
const rootReducer = combineReducers({
  platformAuth: platformAuthSlice,
  tenantManagement: tenantManagementSlice,
  subscription: subscriptionSlice,
  moduleManagement: moduleManagementSlice,
  systemSettings: systemSettingsSlice,
  licenseManagement: licenseManagementSlice,
  // Add RTK Query API reducer
  [baseApi.reducerPath]: baseApi.reducer,
});

// Persist configuration
const persistConfig = {
  key: 'platform-admin-root',
  storage,
  whitelist: ['platformAuth', 'systemSettings'], // Only persist auth and settings
  blacklist: [baseApi.reducerPath], // Don't persist API cache
};

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
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);