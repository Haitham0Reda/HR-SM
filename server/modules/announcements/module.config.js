/**
 * Announcements Module Configuration
 */

export default {
  name: 'announcements',
  displayName: 'Announcements',
  version: '1.0.0',
  description: 'Company announcements and communications module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/announcements',
    file: './routes/announcement.routes.js'
  },
  permissions: [
    'announcements:read',
    'announcements:write',
    'announcements:admin'
  ],
  features: [
    'create-announcements',
    'schedule-announcements',
    'target-audiences',
    'announcement-analytics'
  ]
};