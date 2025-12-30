/**
 * Payroll Module Configuration
 */

export default {
  name: 'payroll',
  displayName: 'Payroll',
  version: '1.0.0',
  description: 'Payroll management module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/payroll',
    file: './routes/payroll.routes.js'
  },
  permissions: [
    'payroll:read',
    'payroll:write',
    'payroll:delete',
    'payroll:admin'
  ],
  features: [
    'salary-calculation',
    'payslip-generation',
    'tax-calculation',
    'bonus-management'
  ]
};