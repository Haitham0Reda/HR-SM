/**
 * Subscriptions API - RTK Query Endpoints
 * 
 * Provides endpoints for subscription management:
 * - CRUD operations for subscription plans
 * - Tenant subscription assignment
 * - Subscription analytics
 */

import { baseApi } from '../api';

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all subscription plans
    getPlans: builder.query({
      query: () => '/subscriptions/plans',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Plans', id })),
              { type: 'Plans', id: 'LIST' },
            ]
          : [{ type: 'Plans', id: 'LIST' }],
    }),

    // Create new plan
    createPlan: builder.mutation({
      query: (data) => ({
        url: '/subscriptions/plans',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Plans', id: 'LIST' }],
    }),

    // Update plan
    updatePlan: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/subscriptions/plans/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Plans', id },
        { type: 'Plans', id: 'LIST' },
      ],
    }),

    // Get all subscriptions
    getSubscriptions: builder.query({
      query: () => '/subscriptions',
      providesTags: [{ type: 'Subscriptions', id: 'LIST' }],
    }),

    // Get tenant subscription
    getTenantSubscription: builder.query({
      query: (tenantId) => `/subscriptions/tenants/${tenantId}/subscription`,
      providesTags: (result, error, tenantId) => [
        { type: 'Subscriptions', id: tenantId },
      ],
    }),

    // Assign plan to tenant
    assignPlanToTenant: builder.mutation({
      query: ({ tenantId, planId }) => ({
        url: `/subscriptions/tenants/${tenantId}/subscription`,
        method: 'PATCH',
        body: { planId },
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Subscriptions', id: tenantId },
        { type: 'Subscriptions', id: 'LIST' },
        { type: 'Tenants', id: tenantId },
      ],
    }),

    // Update subscription
    updateSubscription: builder.mutation({
      query: ({ tenantId, ...data }) => ({
        url: `/subscriptions/${tenantId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { tenantId }) => [
        { type: 'Subscriptions', id: tenantId },
        { type: 'Subscriptions', id: 'LIST' },
      ],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useGetSubscriptionsQuery,
  useGetTenantSubscriptionQuery,
  useAssignPlanToTenantMutation,
  useUpdateSubscriptionMutation,
  useLazyGetPlansQuery,
  useLazyGetTenantSubscriptionQuery,
} = subscriptionsApi;
