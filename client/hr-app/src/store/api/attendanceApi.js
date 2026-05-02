/**
 * Attendance API - RTK Query Endpoints
 * 
 * Provides endpoints for attendance management:
 * - CRUD operations for attendance records
 * - Check-in/check-out functionality
 * - Attendance reports and statistics
 */

import { baseApi } from '../api';

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all attendance records with optional filtering
    getAttendance: builder.query({
      query: (params) => ({
        url: '/attendance',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Attendance', id })),
              { type: 'Attendance', id: 'LIST' },
            ]
          : [{ type: 'Attendance', id: 'LIST' }],
    }),

    // Get single attendance record by ID
    getAttendanceById: builder.query({
      query: (id) => `/attendance/${id}`,
      providesTags: (result, error, id) => [{ type: 'Attendance', id }],
    }),

    // Create attendance record
    createAttendance: builder.mutation({
      query: (data) => ({
        url: '/attendance',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Attendance', id: 'LIST' }],
    }),

    // Update attendance record
    updateAttendance: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/attendance/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Attendance', id },
        { type: 'Attendance', id: 'LIST' },
      ],
    }),

    // Delete attendance record
    deleteAttendance: builder.mutation({
      query: (id) => ({
        url: `/attendance/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Attendance', id },
        { type: 'Attendance', id: 'LIST' },
      ],
    }),

    // Check in
    checkIn: builder.mutation({
      query: (data) => ({
        url: '/attendance/check-in',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Attendance', id: 'LIST' }],
    }),

    // Check out
    checkOut: builder.mutation({
      query: (data) => ({
        url: '/attendance/check-out',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Attendance', id: 'LIST' }],
    }),

    // Get today's attendance
    getTodayAttendance: builder.query({
      query: (params) => ({
        url: '/attendance/today',
        params,
      }),
      providesTags: [{ type: 'Attendance', id: 'TODAY' }],
    }),

    // Get monthly attendance report
    getMonthlyAttendance: builder.query({
      query: (params) => ({
        url: '/attendance/monthly',
        params,
      }),
      providesTags: [{ type: 'Attendance', id: 'MONTHLY' }],
    }),

    // Get department attendance statistics
    getDepartmentStats: builder.query({
      query: (params) => ({
        url: '/attendance/departments',
        params,
      }),
      providesTags: [{ type: 'Attendance', id: 'DEPT_STATS' }],
    }),

    // Get attendance report (generic)
    getAttendanceReport: builder.query({
      query: (params) => ({
        url: '/attendance/report',
        params,
      }),
      providesTags: [{ type: 'Attendance', id: 'REPORT' }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetAttendanceQuery,
  useGetAttendanceByIdQuery,
  useCreateAttendanceMutation,
  useUpdateAttendanceMutation,
  useDeleteAttendanceMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useGetTodayAttendanceQuery,
  useGetMonthlyAttendanceQuery,
  useGetDepartmentStatsQuery,
  useGetAttendanceReportQuery,
  useLazyGetAttendanceQuery,
  useLazyGetTodayAttendanceQuery,
  useLazyGetMonthlyAttendanceQuery,
} = attendanceApi;
