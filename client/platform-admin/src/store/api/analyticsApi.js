/**
 * Analytics API - RTK Query Endpoints
 * 
 * Provides endpoints for analytics and reporting:
 * - Revenue analytics
 * - Usage analytics
 * - Performance metrics
 * - System health monitoring
 * - Audit logs
 */

import { baseApi } from '../api';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get revenue analytics
    getRevenueAnalytics: builder.query({
      query: (dateRange) => ({
        url: '/analytics/revenue',
        params: dateRange,
      }),
      providesTags: [{ type: 'Analytics', id: 'REVENUE' }],
    }),

    // Get usage analytics
    getUsageAnalytics: builder.query({
      query: (dateRange) => ({
        url: '/analytics/usage',
        params: dateRange,
      }),
      providesTags: [{ type: 'Analytics', id: 'USAGE' }],
    }),

    // Get performance metrics
    getPerformanceMetrics: builder.query({
      query: (dateRange) => ({
        url: '/analytics/performance',
        params: dateRange,
      }),
      providesTags: [{ type: 'Analytics', id: 'PERFORMANCE' }],
    }),

    // Get system metrics
    getSystemMetrics: builder.query({
      query: () => '/system/metrics',
      providesTags: [{ type: 'System', id: 'METRICS' }],
    }),

    // Get system health
    getSystemHealth: builder.query({
      query: () => '/system/health',
      providesTags: [{ type: 'System', id: 'HEALTH' }],
    }),

    // Get audit logs
    getAuditLogs: builder.query({
      query: (filters) => ({
        url: '/audit-logs',
        params: filters,
      }),
      providesTags: [{ type: 'AuditLogs', id: 'LIST' }],
    }),

    // Get tenant analytics
    getTenantAnalytics: builder.query({
      query: ({ tenantId, dateRange }) => ({
        url: `/analytics/tenants/${tenantId}`,
        params: dateRange,
      }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Analytics', id: `TENANT-${tenantId}` },
      ],
    }),

    // Get module usage statistics
    getModuleUsageStats: builder.query({
      query: (dateRange) => ({
        url: '/analytics/modules/usage',
        params: dateRange,
      }),
      providesTags: [{ type: 'Analytics', id: 'MODULE_USAGE' }],
    }),

    // Get subscription analytics
    getSubscriptionAnalytics: builder.query({
      query: (dateRange) => ({
        url: '/analytics/subscriptions',
        params: dateRange,
      }),
      providesTags: [{ type: 'Analytics', id: 'SUBSCRIPTIONS' }],
    }),

    // Get churn analytics
    getChurnAnalytics: builder.query({
      query: (dateRange) => ({
        url: '/analytics/churn',
        params: dateRange,
      }),
      providesTags: [{ type: 'Analytics', id: 'CHURN' }],
    }),
  }),
});

// Export hooks for usage in components
export const {
  useGetRevenueAnalyticsQuery,
  useGetUsageAnalyticsQuery,
  useGetPerformanceMetricsQuery,
  useGetSystemMetricsQuery,
  useGetSystemHealthQuery,
  useGetAuditLogsQuery,
  useGetTenantAnalyticsQuery,
  useGetModuleUsageStatsQuery,
  useGetSubscriptionAnalyticsQuery,
  useGetChurnAnalyticsQuery,
  useLazyGetRevenueAnalyticsQuery,
  useLazyGetUsageAnalyticsQuery,
  useLazyGetAuditLogsQuery,
} = analyticsApi;
