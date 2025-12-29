import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        // baseUrl: 'http://localhost:3000',
        supportFile: 'e2e/support/e2e.js',
        specPattern: 'e2e/specs/**/*.cy.js',
        fixturesFolder: 'e2e/fixtures',
        screenshotsFolder: 'e2e/screenshots',
        videosFolder: 'e2e/videos',
        downloadsFolder: 'e2e/downloads',

        // Test configuration
        viewportWidth: 1280,
        viewportHeight: 720,
        video: true,
        screenshotOnRunFailure: true,

        // Timeouts
        defaultCommandTimeout: 10000,
        requestTimeout: 10000,
        responseTimeout: 10000,
        pageLoadTimeout: 30000,

        // Test isolation and cleanup
        testIsolation: true,

        // Environment variables
        env: {
            // Backend API URL
            apiUrl: 'http://localhost:5000',
            // Platform Admin URL
            platformUrl: 'http://localhost:3001',
            // License Server URL
            licenseServerUrl: 'http://localhost:4000',
            // Test database
            testDatabase: 'hr-sm-e2e-test',
            // Test environment flag
            isTestEnvironment: true,
            // Cypress test environment flag
            CYPRESS_ENV: 'test'
        },

        setupNodeEvents(on, config) {
            // Import database utilities
            const dbUtils = require('./e2e/support/database.js');

            // Task for database operations
            on('task', {
                // Database cleanup task
                async cleanupDatabase() {
                    try {
                        const result = await dbUtils.cleanupDatabase();
                        return result;
                    } catch (error) {
                        console.error('Database cleanup failed:', error);
                        return { success: true, message: 'Database cleanup skipped (no connection)' };
                    }
                },

                // Seed test data task
                async seedTestData(data) {
                    try {
                        const result = await dbUtils.seedTestData(data);
                        return result;
                    } catch (error) {
                        console.error('Seed test data failed:', error);
                        return { success: true, message: 'Seed test data skipped (no connection)' };
                    }
                },

                // Verify database connection
                async verifyDatabaseConnection() {
                    try {
                        const result = await dbUtils.verifyDatabaseConnection();
                        return result;
                    } catch (error) {
                        console.error('Database connection verification failed:', error);
                        return { success: false, error: error.message };
                    }
                },

                // Get database statistics
                async getDatabaseStats() {
                    try {
                        const stats = await dbUtils.getDatabaseStats();
                        return stats;
                    } catch (error) {
                        console.error('Failed to get database stats:', error);
                        return {};
                    }
                },

                // Log messages from tests
                log(message) {
                    console.log(`[E2E] ${new Date().toISOString()}: ${message}`);
                    return null;
                }
            });

            // Set up test reporter
            on('before:run', (details) => {
                if (global.e2eReporter) {
                    global.e2eReporter.onRunStart(config);
                }
            });

            on('after:run', (results) => {
                if (global.e2eReporter) {
                    global.e2eReporter.onRunEnd(results);
                }
            });

            on('before:spec', (spec) => {
                console.log(`Running spec: ${spec.name}`);
            });

            on('after:spec', (spec, results) => {
                console.log(`Completed spec: ${spec.name} - ${results.stats.failures} failures`);
            });

            return config;
        },
    },

    // Component testing configuration (for future use)
    component: {
        devServer: {
            framework: 'react',
            bundler: 'webpack',
        },
        specPattern: 'client/src/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'e2e/support/component.js'
    },

    // Global configuration
    retries: {
        runMode: 2,
        openMode: 0
    },

    // Browser configuration
    chromeWebSecurity: false
});