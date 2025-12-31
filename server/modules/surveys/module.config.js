/**
 * Surveys Module Configuration
 */

export default {
  name: 'surveys',
  displayName: 'Surveys',
  version: '1.0.0',
  description: 'Employee surveys and feedback module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/surveys',
    file: './routes/survey.routes.js'
  },
  permissions: [
    'surveys:read',
    'surveys:write',
    'surveys:delete',
    'surveys:admin'
  ],
  features: [
    'survey-creation',
    'anonymous-surveys',
    'survey-analytics',
    'feedback-collection'
  ]
};