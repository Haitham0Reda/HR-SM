const path = require('path');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Fix date-fns v4 ESM resolution issues with @mui/x-date-pickers
            webpackConfig.resolve.extensionAlias = {
                '.js': ['.ts', '.tsx', '.js', '.jsx'],
            };
            
            // Add alias for shared components
            webpackConfig.resolve.alias = {
                ...webpackConfig.resolve.alias,
                '@shared': path.resolve(__dirname, '../shared'),
            };

            // Optimize build output
            if (process.env.NODE_ENV === 'production') {
                // Set output directory
                webpackConfig.output.path = path.resolve(__dirname, 'build');
                webpackConfig.output.publicPath = '/platform-admin/';
                
                // Optimize chunks
                webpackConfig.optimization = {
                    ...webpackConfig.optimization,
                    splitChunks: {
                        chunks: 'all',
                        cacheGroups: {
                            vendor: {
                                test: /[\\/]node_modules[\\/]/,
                                name: 'vendors',
                                priority: 10,
                            },
                            shared: {
                                test: /[\\/]shared[\\/]/,
                                name: 'shared',
                                priority: 5,
                            },
                        },
                    },
                };
            }
            
            return webpackConfig;
        },
    },
    devServer: (devServerConfig) => {
        // Remove deprecated options
        delete devServerConfig.onBeforeSetupMiddleware;
        delete devServerConfig.onAfterSetupMiddleware;

        // Use the new setupMiddlewares option
        devServerConfig.setupMiddlewares = (middlewares, devServer) => {
            return middlewares;
        };

        // Configure dev server for platform-admin
        devServerConfig.port = 3001; // Force port 3001
        devServerConfig.open = false; // Don't auto-open browser
        devServerConfig.hot = true;
        devServerConfig.historyApiFallback = true;

        return devServerConfig;
    },
    jest: {
        configure: (jestConfig) => {
            // Transform fast-check, axios, and react-router-dom ES modules
            jestConfig.transformIgnorePatterns = [
                'node_modules/(?!(fast-check|axios|react-router-dom|react-router)/)',
            ];
            
            // Add module name mapper for shared components
            jestConfig.moduleNameMapper = {
                ...jestConfig.moduleNameMapper,
                '^@shared/(.*)$': '<rootDir>/../shared/$1',
            };
            
            return jestConfig;
        },
    },
};
