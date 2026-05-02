/**
 * RTK Query API Configuration
 * 
 * Centralized API configuration using RTK Query for:
 * - Automatic caching
 * - Request deduplication
 * - Optimistic updates
 * - Automatic re-fetching
 * - JWT token injection
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Base query with JWT authentication
 * Automatically injects JWT token from Redux store into request headers
 */
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  prepareHeaders: (headers, { getState }) => {
    // Get token from Redux store
    const token = getState().auth.tenantToken;
    
    // If we have a token, add it to headers
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Ensure content type is set
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    return headers;
  },
});

/**
 * Base query with error handling and token refresh
 * Wraps the base query to handle 401 errors and attempt token refresh
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Handle 401 Unauthorized errors
  if (result.error && result.error.status === 401) {
    // Clear auth state and redirect to login
    // This will be handled by the auth slice
    api.dispatch({ type: 'auth/clearAuthState' });
  }
  
  return result;
};

/**
 * Base API configuration
 * All API endpoints will be injected into this base API
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Employees',
    'Attendance',
    'Leave',
    'Departments',
    'Positions',
    'Tasks',
    'Documents',
    'Payroll',
    'Holidays',
    'Missions',
    'Overtime',
    'Requests',
    'Announcements',
    'Events',
    'Surveys',
    'Reports',
    'Analytics',
    'Settings',
    'Users',
    'Roles',
    'Permissions',
  ],
  endpoints: () => ({}), // Endpoints will be injected by individual API files
});

// Export hooks for usage in components
export const { 
  // Hooks will be auto-generated when endpoints are injected
} = baseApi;

export default baseApi;
