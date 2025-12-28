import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authSlice from './slices/authSlice';
import tenantSlice from './slices/tenantSlice';
import moduleSlice from './slices/moduleSlice';
import notificationSlice from './slices/notificationSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'tenant'], // Only persist auth and tenant state
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  tenant: tenantSlice,
  modules: moduleSlice,
  notifications: notificationSlice,
});

// Persisted reducer
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

// Create persistor
export const persistor = persistStore(store);

// Export types for TypeScript (if needed later)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;