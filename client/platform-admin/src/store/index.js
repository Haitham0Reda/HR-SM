import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import platformAuthSlice from './slices/platformAuthSlice';
import tenantManagementSlice from './slices/tenantManagementSlice';
import subscriptionSlice from './slices/subscriptionSlice';
import moduleManagementSlice from './slices/moduleManagementSlice';
import systemSettingsSlice from './slices/systemSettingsSlice';
import licenseManagementSlice from './slices/licenseManagementSlice';

// Combine reducers
const rootReducer = combineReducers({
  platformAuth: platformAuthSlice,
  tenantManagement: tenantManagementSlice,
  subscription: subscriptionSlice,
  moduleManagement: moduleManagementSlice,
  systemSettings: systemSettingsSlice,
  licenseManagement: licenseManagementSlice,
});

// Persist configuration
const persistConfig = {
  key: 'platform-admin-root',
  storage,
  whitelist: ['platformAuth', 'systemSettings'], // Only persist auth and settings
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
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

export const persistor = persistStore(store);

// Export types for TypeScript (if needed)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;