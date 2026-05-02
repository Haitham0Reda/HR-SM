/**
 * Payroll API - RTK Query Endpoints
 * 
 * Provides endpoints for payroll management:
 * - CRUD operations for payroll records
 * - Payroll processing
 * - Payslip generation and retrieval
 */

import { baseApi } from '../api';

export const payrollApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all payroll records with optional filtering
    getPayroll: builder.query({
      query: (params) => ({
        url: '/payroll',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Payroll', id })),
              { type: 'Payroll', id: 'LIST' },
            ]
          : [{ type: 'Payroll', id: 'LIST' }],
    }),

    // Get single payroll record by ID
    getPayrollById: builder.query({
      query: (id) => `/payroll/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payroll', id }],
    }),

    // Create payroll record
    createPayroll: builder.mutation({
      query: (data) => ({
        url: '/payroll',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Payroll', id: 'LIST' }],
    }),

    // Update payroll record
    updatePayroll: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/payroll/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Payroll', id },
        { type: 'Payroll', id: 'LIST' },
      ],
    }),

    // Delete payroll record
    deletePayroll: builder.mutation({
      query: (id) => ({
        url: `/payroll/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Payroll', id },
        { type: 'Payroll', id: 'LIST' },
      ],
    }),

    // Process payroll
    processPayroll: builder.mutation({
      query: (data) => ({
        url: '/payroll/process',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Payroll', id: 'LIST' }],
    }),

    // Get payslip
    getPayslip: builder.query({
      query: ({ employeeId, period }) => ({
        url: `/payroll/payslip`,
        params: { employeeId, period },
      }),
      providesTags: (result, error, { employeeId, period }) => [
        { type: 'Payroll', id: `PAYSLIP-${employeeId}-${period}` },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetPayrollQuery,
  useGetPayrollByIdQuery,
  useCreatePayrollMutation,
  useUpdatePayrollMutation,
  useDeletePayrollMutation,
  useProcessPayrollMutation,
  useGetPayslipQuery,
  useLazyGetPayrollQuery,
  useLazyGetPayslipQuery,
} = payrollApi;
