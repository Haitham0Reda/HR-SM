/**
 * Documents API - RTK Query Endpoints
 * 
 * Provides endpoints for document management:
 * - CRUD operations for documents
 * - File upload and download
 * - Document categorization and filtering
 */

import { baseApi } from '../api';

export const documentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all documents with optional filtering
    getDocuments: builder.query({
      query: (params) => ({
        url: '/documents',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Documents', id })),
              { type: 'Documents', id: 'LIST' },
            ]
          : [{ type: 'Documents', id: 'LIST' }],
    }),

    // Get single document by ID
    getDocument: builder.query({
      query: (id) => `/documents/${id}`,
      providesTags: (result, error, id) => [{ type: 'Documents', id }],
    }),

    // Create document
    createDocument: builder.mutation({
      query: (data) => ({
        url: '/documents',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Documents', id: 'LIST' }],
    }),

    // Update document
    updateDocument: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/documents/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Documents', id },
        { type: 'Documents', id: 'LIST' },
      ],
    }),

    // Delete document
    deleteDocument: builder.mutation({
      query: (id) => ({
        url: `/documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Documents', id },
        { type: 'Documents', id: 'LIST' },
      ],
    }),

    // Upload document
    uploadDocument: builder.mutation({
      query: (formData) => ({
        url: '/documents/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [{ type: 'Documents', id: 'LIST' }],
    }),

    // Download document
    downloadDocument: builder.query({
      query: (id) => ({
        url: `/documents/${id}/download`,
        responseHandler: async (response) => {
          const blob = await response.blob();
          const contentDisposition = response.headers.get('content-disposition');
          let filename = `document-${id}`;
          
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          
          return { success: true, filename };
        },
      }),
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetDocumentsQuery,
  useGetDocumentQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useUploadDocumentMutation,
  useLazyDownloadDocumentQuery,
  useLazyGetDocumentsQuery,
  useLazyGetDocumentQuery,
} = documentsApi;
