/**
 * Dashboard Module Configuration
 */

export default {
  name: 'dashboard',
  displayName: 'Dashboard',
  version: '1.0.0',
  description: 'Dashboard and overview module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/dashboard',
    file: './routes/dashboard.routes.js'
  },
  permissions: [
    'dashboard:read',
    'dashboard:write',
    'dashboard:admin'
  ],
  features: [
    'overview-widgets',
    'custom-dashboards',
    'real-time-updates',
    'dashboard-sharing'
  ]
};