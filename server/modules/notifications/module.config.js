/**
 * Notifications Module Configuration
 */

export default {
  name: 'notifications',
  version: '1.0.0',
  description: 'Notification management module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/notifications',
    file: './routes/notification.routes.js'
  },
  permissions: [
    'notifications:read',
    'notifications:write',
    'notifications:admin'
  ],
  features: [
    'push-notifications',
    'email-notifications',
    'sms-notifications',
    'in-app-notifications'
  ]
};