/**
 * RTK Query API Configuration for Platform Admin
 * 
 * Centralized API configuration using RTK Query for:
 * - Automatic caching
 * - Request deduplication
 * - Optimistic updates
 * - Automatic re-fetching
 * - Platform JWT token injection
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import SecureLS from 'secure-ls';

// Secure local storage for platform tokens
const ls = new SecureLS({ encodingType: 'aes' });

/**
 * Base query with platform JWT authentication
 * Automatically injects platform JWT token from secure storage into request headers
 */
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/platform',
  timeout: 30000,
  prepareHeaders: (headers) => {
    // Get platform token from secure storage
    const token = ls.get('platformToken');
    
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
 * Wraps the base query to handle 401 errors and clear auth state
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Handle 401 Unauthorized errors
  if (result.error && result.error.status === 401) {
    // Clear token and redirect to login
    ls.remove('platformToken');
    window.location.href = '/login';
  }
  
  return result;
};

/**
 * Base API configuration for Platform Admin
 * All API endpoints will be injected into this base API
 */
export const baseApi = createApi({
  reducerPath: 'platformApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Tenants',
    'Subscriptions',
    'Modules',
    'Licenses',
    'Analytics',
    'System',
    'AuditLogs',
    'Plans',
  ],
  endpoints: () => ({}), // Endpoints will be injected by individual API files
});

// Export hooks for usage in components
export const { 
  // Hooks will be auto-generated when endpoints are injected
} = baseApi;

export default baseApi;
