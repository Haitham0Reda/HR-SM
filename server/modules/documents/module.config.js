/**
 * Documents Module Configuration
 */

export default {
  name: 'documents',
  displayName: 'Documents',
  version: '1.0.0',
  description: 'Document management and storage module',
  dependencies: ['hr-core'],
  routes: {
    prefix: '/api/v1/documents',
    file: './routes/document.routes.js'
  },
  permissions: [
    'documents:read',
    'documents:write',
    'documents:delete',
    'documents:admin'
  ],
  features: [
    'document-upload',
    'document-templates',
    'version-control',
    'document-sharing'
  ]
};