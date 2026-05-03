/**
 * Employees API - RTK Query Endpoints
 * 
 * Provides endpoints for employee/user management:
 * - CRUD operations for employees
 * - Profile management
 * - Vacation balance updates
 * - Bulk operations
 */

import { baseApi } from '../api';

export const employeesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all employees with optional filtering
    getEmployees: builder.query({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: (result) => {
        // Handle both direct array and { data: array } response shapes.
        // Legacy axios extracts .data in interceptor; RTK Query does not.
        const items = Array.isArray(result) ? result : result?.data;
        return items
          ? [
              ...items.map(({ id }) => ({ type: 'Employees', id })),
              { type: 'Employees', id: 'LIST' },
            ]
          : [{ type: 'Employees', id: 'LIST' }];
      },
    }),

    // Get single employee by ID
    getEmployee: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'Employees', id }],
    }),

    // Create new employee
    createEmployee: builder.mutation({
      query: (data) => ({
        url: '/users',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Employees', id: 'LIST' }],
    }),

    // Update employee
    updateEmployee: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Employees', id },
        { type: 'Employees', id: 'LIST' },
      ],
    }),

    // Delete employee
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Employees', id },
        { type: 'Employees', id: 'LIST' },
      ],
    }),

    // Get current user profile
    getProfile: builder.query({
      query: () => '/users/profile',
      providesTags: ['Users'],
    }),

    // Update current user profile
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),

    // Upload profile picture
    uploadProfilePicture: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/users/${id}/profile-picture`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Employees', id }],
    }),

    // Get plain password for credential generation
    getPlainPassword: builder.query({
      query: (id) => `/users/${id}/plain-password`,
    }),

    // Update vacation balance
    updateVacationBalance: builder.mutation({
      query: ({ userId, ...balanceData }) => ({
        url: `/users/${userId}/vacation-balance`,
        method: 'PUT',
        body: balanceData,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Employees', id: userId },
      ],
    }),

    // Bulk update vacation balances
    bulkUpdateVacationBalances: builder.mutation({
      query: (updates) => ({
        url: '/users/bulk-update-vacation-balances',
        method: 'POST',
        body: { updates },
      }),
      invalidatesTags: [{ type: 'Employees', id: 'LIST' }],
    }),

    // Bulk create users from Excel
    bulkCreateFromExcel: builder.mutation({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/users/bulk-create',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: [{ type: 'Employees', id: 'LIST' }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUploadProfilePictureMutation,
  useGetPlainPasswordQuery,
  useLazyGetPlainPasswordQuery,
  useUpdateVacationBalanceMutation,
  useBulkUpdateVacationBalancesMutation,
  useBulkCreateFromExcelMutation,
} = employeesApi;
