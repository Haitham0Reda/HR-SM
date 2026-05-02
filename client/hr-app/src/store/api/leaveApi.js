/**
 * Leave/Vacation API - RTK Query Endpoints
 * 
 * Provides endpoints for leave/vacation management:
 * - CRUD operations for leave requests
 * - Approval, rejection, and cancellation workflows
 * - File upload support for attachments
 */

import { baseApi } from '../api';

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all leave requests with optional filtering
    getLeaves: builder.query({
      query: (params) => ({
        url: '/vacations',
        params: {
          ...params,
          _t: Date.now(), // Cache busting
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Leave', id })),
              { type: 'Leave', id: 'LIST' },
            ]
          : [{ type: 'Leave', id: 'LIST' }],
    }),

    // Get single leave request by ID
    getLeave: builder.query({
      query: (id) => `/vacations/${id}`,
      providesTags: (result, error, id) => [{ type: 'Leave', id }],
    }),

    // Apply for leave (create new leave request)
    applyLeave: builder.mutation({
      query: (data) => {
        // Check if data is FormData (for file uploads)
        const isFormData = data instanceof FormData;
        return {
          url: '/vacations',
          method: 'POST',
          body: data,
          ...(isFormData && {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }),
        };
      },
      invalidatesTags: [{ type: 'Leave', id: 'LIST' }],
    }),

    // Update leave request
    updateLeave: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/vacations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leave', id },
        { type: 'Leave', id: 'LIST' },
      ],
      // Dispatch notification update event after status changes
      async onQueryStarted({ id, status }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          if (status && ['approved', 'rejected', 'cancelled'].includes(status)) {
            // Small delay to ensure server creates notification
            await new Promise(resolve => setTimeout(resolve, 500));
            window.dispatchEvent(new CustomEvent('notificationUpdate'));
          }
        } catch (error) {
          // Error already handled by RTK Query
        }
      },
    }),

    // Delete leave request
    deleteLeave: builder.mutation({
      query: (id) => ({
        url: `/vacations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Leave', id },
        { type: 'Leave', id: 'LIST' },
      ],
    }),

    // Approve leave request
    approveLeave: builder.mutation({
      query: ({ id, notes = '' }) => ({
        url: `/vacations/${id}/approve`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leave', id },
        { type: 'Leave', id: 'LIST' },
      ],
      // Dispatch notification update event
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await new Promise(resolve => setTimeout(resolve, 500));
          window.dispatchEvent(new CustomEvent('notificationUpdate'));
        } catch (error) {
          // Error already handled by RTK Query
        }
      },
    }),

    // Reject leave request
    rejectLeave: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/vacations/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leave', id },
        { type: 'Leave', id: 'LIST' },
      ],
      // Dispatch notification update event
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await new Promise(resolve => setTimeout(resolve, 500));
          window.dispatchEvent(new CustomEvent('notificationUpdate'));
        } catch (error) {
          // Error already handled by RTK Query
        }
      },
    }),

    // Cancel leave request
    cancelLeave: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/vacations/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leave', id },
        { type: 'Leave', id: 'LIST' },
      ],
      // Dispatch notification update event
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await new Promise(resolve => setTimeout(resolve, 500));
          window.dispatchEvent(new CustomEvent('notificationUpdate'));
        } catch (error) {
          // Error already handled by RTK Query
        }
      },
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetLeavesQuery,
  useGetLeaveQuery,
  useApplyLeaveMutation,
  useUpdateLeaveMutation,
  useDeleteLeaveMutation,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
  useCancelLeaveMutation,
  useLazyGetLeavesQuery,
  useLazyGetLeaveQuery,
} = leaveApi;
