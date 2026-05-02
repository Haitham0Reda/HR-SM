/**
 * Tasks API - RTK Query Endpoints
 * 
 * Provides endpoints for task management:
 * - CRUD operations for tasks
 * - Task assignment and status updates
 * - Task reports and file uploads
 */

import { baseApi } from '../api';

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all tasks for current user
    getTasks: builder.query({
      query: () => '/tasks',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Tasks', id })),
              { type: 'Tasks', id: 'LIST' },
            ]
          : [{ type: 'Tasks', id: 'LIST' }],
    }),

    // Get task by ID
    getTask: builder.query({
      query: (id) => `/tasks/${id}`,
      providesTags: (result, error, id) => [{ type: 'Tasks', id }],
    }),

    // Create new task
    createTask: builder.mutation({
      query: (data) => ({
        url: '/tasks',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Tasks', id: 'LIST' }],
    }),

    // Update task
    updateTask: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tasks/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tasks', id },
        { type: 'Tasks', id: 'LIST' },
      ],
    }),

    // Delete task
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Tasks', id },
        { type: 'Tasks', id: 'LIST' },
      ],
    }),

    // Update task status
    updateTaskStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/tasks/${id}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tasks', id },
        { type: 'Tasks', id: 'LIST' },
      ],
    }),

    // Assign task
    assignTask: builder.mutation({
      query: ({ id, assigneeId }) => ({
        url: `/tasks/${id}/assign`,
        method: 'POST',
        body: { assigneeId },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tasks', id },
        { type: 'Tasks', id: 'LIST' },
      ],
    }),

    // Get task reports
    getTaskReports: builder.query({
      query: (taskId) => `/tasks/${taskId}/reports`,
      providesTags: (result, error, taskId) => [
        { type: 'Tasks', id: `REPORTS-${taskId}` },
      ],
    }),

    // Create or update task report
    upsertTaskReport: builder.mutation({
      query: ({ taskId, ...reportData }) => ({
        url: `/tasks/${taskId}/reports`,
        method: 'POST',
        body: reportData,
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Tasks', id: taskId },
        { type: 'Tasks', id: `REPORTS-${taskId}` },
      ],
    }),

    // Submit task report
    submitTaskReport: builder.mutation({
      query: (taskId) => ({
        url: `/tasks/${taskId}/reports/submit`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (result, error, taskId) => [
        { type: 'Tasks', id: taskId },
        { type: 'Tasks', id: `REPORTS-${taskId}` },
      ],
    }),

    // Review task report
    reviewTaskReport: builder.mutation({
      query: ({ taskId, ...reviewData }) => ({
        url: `/tasks/${taskId}/reports/review`,
        method: 'POST',
        body: reviewData,
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Tasks', id: taskId },
        { type: 'Tasks', id: `REPORTS-${taskId}` },
      ],
    }),

    // Upload file for task report
    uploadReportFile: builder.mutation({
      query: ({ taskId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/tasks/${taskId}/reports/upload`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Tasks', id: `REPORTS-${taskId}` },
      ],
    }),

    // Download report file
    downloadReportFile: builder.query({
      query: (fileId) => ({
        url: `/tasks/files/${fileId}`,
        responseHandler: async (response) => {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', fileId);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          return { success: true };
        },
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskStatusMutation,
  useAssignTaskMutation,
  useGetTaskReportsQuery,
  useUpsertTaskReportMutation,
  useSubmitTaskReportMutation,
  useReviewTaskReportMutation,
  useUploadReportFileMutation,
  useLazyDownloadReportFileQuery,
  useLazyGetTasksQuery,
  useLazyGetTaskQuery,
} = tasksApi;
