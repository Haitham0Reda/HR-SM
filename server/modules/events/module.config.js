/**
 * Events Module Configuration
 */

export default {
  name: 'events',
  displayName: 'Events',
  version: '1.0.0',
  description: 'Event management and calendar module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/events',
    file: './routes/event.routes.js'
  },
  permissions: [
    'events:read',
    'events:write',
    'events:delete',
    'events:admin'
  ],
  features: [
    'event-creation',
    'calendar-integration',
    'event-notifications',
    'recurring-events'
  ]
};