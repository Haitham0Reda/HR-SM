/**
 * Reports Module Configuration
 */

export default {
  name: 'reports',
  displayName: 'Reports',
  version: '1.0.0',
  description: 'Reporting and analytics module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/reports',
    file: './routes/report.routes.js'
  },
  permissions: [
    'reports:read',
    'reports:write',
    'reports:admin'
  ],
  features: [
    'attendance-reports',
    'payroll-reports',
    'performance-reports',
    'custom-reports'
  ]
};