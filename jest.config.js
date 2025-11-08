export default {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/config/**/*.js',
    '!server/**/*.model.js',
    '!server/**/*.test.js'
  ],
  testMatch: ['**/server/testing/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/server/testing/setup.js'],
  verbose: true,
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
  },
  transform: {}
};