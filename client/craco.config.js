module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Fix date-fns v4 ESM resolution issues with @mui/x-date-pickers
            webpackConfig.resolve.extensionAlias = {
                '.js': ['.ts', '.tsx', '.js', '.jsx'],
            };
            
            // Disable React development warnings and performance monitoring
            if (process.env.NODE_ENV === 'development') {
                // Add webpack DefinePlugin to disable React warnings
                const webpack = require('webpack');
                
                webpackConfig.plugins.push(
                    new webpack.DefinePlugin({
                        '__REACT_DEVTOOLS_GLOBAL_HOOK__': 'undefined',
                        '__PERFORMANCE_OBSERVER__': 'undefined'
                    })
                );
                
                // Disable source maps for performance
                webpackConfig.devtool = false;
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

        // Disable performance warnings in dev server
        devServerConfig.client = {
            ...devServerConfig.client,
            overlay: {
                errors: true,
                warnings: false, // Disable warning overlay
                runtimeErrors: false // Disable runtime error overlay
            }
        };

        return devServerConfig;
    },
    jest: {
        configure: (jestConfig) => {
            // Transform fast-check, axios, and react-router-dom ES modules
            jestConfig.transformIgnorePatterns = [
                'node_modules/(?!(fast-check|axios|react-router-dom|react-router|@standard-schema/utils)/)',
            ];
            return jestConfig;
        },
    },
};
