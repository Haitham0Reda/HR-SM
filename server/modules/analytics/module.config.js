/**
 * Analytics Module Configuration
 */

export default {
  name: 'analytics',
  displayName: 'Analytics',
  version: '1.0.0',
  description: 'Analytics and reporting module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/analytics',
    file: './routes/analytics.routes.js'
  },
  permissions: [
    'analytics:read',
    'analytics:write',
    'analytics:admin'
  ],
  features: [
    'dashboard-analytics',
    'custom-reports',
    'data-visualization',
    'export-data'
  ]
};