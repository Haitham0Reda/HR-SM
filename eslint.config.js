export default [
  {
    ignores: ['node_modules/**', 'client/node_modules/**', 'dist/**', 'build/**']
  },
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error'
    }
  },
  {
    files: ['server/modules/hr-core/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/tasks/**', '**/modules/payroll/**', '**/modules/documents/**', '**/modules/reports/**', '**/modules/notifications/**', '**/modules/clinic/**', '**/modules/email-service/**'],
              message: '🚨 CRITICAL: HR-Core CANNOT depend on ANY optional module! HR-Core must work standalone. This is a sacred boundary.'
            }
          ]
        }
      ]
    }
  }
];
