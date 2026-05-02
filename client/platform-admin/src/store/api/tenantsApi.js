/**
 * Tenants API - RTK Query Endpoints
 * 
 * Provides endpoints for tenant management:
 * - CRUD operations for tenants
 * - Tenant suspension and reactivation
 * - Tenant metrics and statistics
 * - Bulk operations
 */

import { baseApi } from '../api';

export const tenantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all tenants with optional filtering
    getTenants: builder.query({
      query: (params) => ({
        url: '/tenants',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Tenants', id })),
              { type: 'Tenants', id: 'LIST' },
            ]
          : [{ type: 'Tenants', id: 'LIST' }],
    }),

    // Get single tenant by ID
    getTenant: builder.query({
      query: (id) => `/tenants/${id}`,
      providesTags: (result, error, id) => [{ type: 'Tenants', id }],
    }),

    // Create new tenant
    createTenant: builder.mutation({
      query: (data) => ({
        url: '/tenants',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Tenants', id: 'LIST' }],
    }),

    // Update tenant
    updateTenant: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tenants/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tenants', id },
        { type: 'Tenants', id: 'LIST' },
      ],
    }),

    // Delete tenant
    deleteTenant: builder.mutation({
      query: (id) => ({
        url: `/tenants/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Tenants', id },
        { type: 'Tenants', id: 'LIST' },
      ],
    }),

    // Suspend tenant
    suspendTenant: builder.mutation({
      query: ({ id, reason = '' }) => ({
        url: `/tenants/${id}/suspend`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tenants', id },
        { type: 'Tenants', id: 'LIST' },
      ],
    }),

    // Reactivate tenant
    reactivateTenant: builder.mutation({
      query: (id) => ({
        url: `/tenants/${id}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Tenants', id },
        { type: 'Tenants', id: 'LIST' },
      ],
    }),

    // Get tenant statistics
    getTenantStats: builder.query({
      query: () => '/tenants/stats',
      providesTags: [{ type: 'Tenants', id: 'STATS' }],
    }),

    // Get tenant metrics
    getTenantMetrics: builder.query({
      query: (id) => `/tenants/${id}/metrics`,
      providesTags: (result, error, id) => [
        { type: 'Tenants', id: `METRICS-${id}` },
      ],
    }),

    // Check tenant limits
    checkTenantLimits: builder.query({
      query: (id) => `/tenants/${id}/limits`,
      providesTags: (result, error, id) => [
        { type: 'Tenants', id: `LIMITS-${id}` },
      ],
    }),

    // Update tenant usage
    updateTenantUsage: builder.mutation({
      query: ({ id, ...usageData }) => ({
        url: `/tenants/${id}/usage`,
        method: 'PATCH',
        body: usageData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tenants', id },
        { type: 'Tenants', id: `METRICS-${id}` },
      ],
    }),

    // Bulk update tenants
    bulkUpdateTenants: builder.mutation({
      query: ({ tenantIds, updates }) => ({
        url: '/tenants/bulk-update',
        method: 'PATCH',
        body: { tenantIds, updates },
      }),
      invalidatesTags: [{ type: 'Tenants', id: 'LIST' }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
  useSuspendTenantMutation,
  useReactivateTenantMutation,
  useGetTenantStatsQuery,
  useGetTenantMetricsQuery,
  useCheckTenantLimitsQuery,
  useUpdateTenantUsageMutation,
  useBulkUpdateTenantsMutation,
  useLazyGetTenantsQuery,
  useLazyGetTenantQuery,
} = tenantsApi;
