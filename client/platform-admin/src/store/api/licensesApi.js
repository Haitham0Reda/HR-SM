/**
 * Licenses API - RTK Query Endpoints
 * 
 * Provides endpoints for license management:
 * - CRUD operations for licenses
 * - License validation and activation
 * - License usage tracking
 */

import { baseApi } from '../api';

export const licensesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all licenses
    getLicenses: builder.query({
      query: (params) => ({
        url: '/licenses',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Licenses', id })),
              { type: 'Licenses', id: 'LIST' },
            ]
          : [{ type: 'Licenses', id: 'LIST' }],
    }),

    // Get license by ID
    getLicense: builder.query({
      query: (id) => `/licenses/${id}`,
      providesTags: (result, error, id) => [{ type: 'Licenses', id }],
    }),

    // Get tenant licenses
    getTenantLicenses: builder.query({
      query: (tenantId) => `/licenses/tenants/${tenantId}`,
      providesTags: (result, error, tenantId) => [
        { type: 'Licenses', id: `TENANT-${tenantId}` },
      ],
    }),

    // Create new license
    createLicense: builder.mutation({
      query: (data) => ({
        url: '/licenses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Licenses', id: 'LIST' }],
    }),

    // Update license
    updateLicense: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/licenses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Licenses', id },
        { type: 'Licenses', id: 'LIST' },
      ],
    }),

    // Delete license
    deleteLicense: builder.mutation({
      query: (id) => ({
        url: `/licenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Licenses', id },
        { type: 'Licenses', id: 'LIST' },
      ],
    }),

    // Activate license
    activateLicense: builder.mutation({
      query: ({ id, activationData }) => ({
        url: `/licenses/${id}/activate`,
        method: 'POST',
        body: activationData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Licenses', id },
        { type: 'Licenses', id: 'LIST' },
      ],
    }),

    // Deactivate license
    deactivateLicense: builder.mutation({
      query: (id) => ({
        url: `/licenses/${id}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Licenses', id },
        { type: 'Licenses', id: 'LIST' },
      ],
    }),

    // Validate license
    validateLicense: builder.query({
      query: (licenseKey) => ({
        url: '/licenses/validate',
        params: { key: licenseKey },
      }),
    }),

    // Get license usage
    getLicenseUsage: builder.query({
      query: (id) => `/licenses/${id}/usage`,
      providesTags: (result, error, id) => [
        { type: 'Licenses', id: `USAGE-${id}` },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetLicensesQuery,
  useGetLicenseQuery,
  useGetTenantLicensesQuery,
  useCreateLicenseMutation,
  useUpdateLicenseMutation,
  useDeleteLicenseMutation,
  useActivateLicenseMutation,
  useDeactivateLicenseMutation,
  useValidateLicenseQuery,
  useGetLicenseUsageQuery,
  useLazyGetLicensesQuery,
  useLazyGetLicenseQuery,
  useLazyValidateLicenseQuery,
} = licensesApi;
