/**
 * Modules API - RTK Query Endpoints
 * 
 * Provides endpoints for module management:
 * - Get available modules
 * - Enable/disable modules for tenants
 * - Module configuration
 */

import { baseApi } from '../api';

export const modulesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all available modules
    getModules: builder.query({
      query: () => '/modules',
      providesTags: [{ type: 'Modules', id: 'LIST' }],
    }),

    // Get tenant modules
    getTenantModules: builder.query({
      query: (tenantId) => `/modules/tenants/${tenantId}/modules`,
      providesTags: (result, error, tenantId) => [
        { type: 'Modules', id: `TENANT-${tenantId}` },
      ],
    }),

    // Enable module for tenant
    enableModule: builder.mutation({
      query: ({ tenantId, moduleId }) => ({
        url: `/modules/tenants/${tenantId}/modules/${moduleId}/enable`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Modules', id: `TENANT-${tenantId}` },
        { type: 'Tenants', id: tenantId },
      ],
    }),

    // Disable module for tenant
    disableModule: builder.mutation({
      query: ({ tenantId, moduleId }) => ({
        url: `/modules/tenants/${tenantId}/modules/${moduleId}/disable`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Modules', id: `TENANT-${tenantId}` },
        { type: 'Tenants', id: tenantId },
      ],
    }),

    // Update module configuration
    updateModuleConfig: builder.mutation({
      query: ({ tenantId, moduleId, config }) => ({
        url: `/modules/tenants/${tenantId}/modules/${moduleId}/config`,
        method: 'PATCH',
        body: config,
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Modules', id: `TENANT-${tenantId}` },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetModulesQuery,
  useGetTenantModulesQuery,
  useEnableModuleMutation,
  useDisableModuleMutation,
  useUpdateModuleConfigMutation,
  useLazyGetModulesQuery,
  useLazyGetTenantModulesQuery,
} = modulesApi;
