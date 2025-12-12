module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Fix date-fns v4 ESM resolution issues with @mui/x-date-pickers
            webpackConfig.resolve.extensionAlias = {
                '.js': ['.ts', '.tsx', '.js', '.jsx'],
            };
            
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

        return devServerConfig;
    },
    jest: {
        configure: (jestConfig) => {
            // Transform fast-check, axios, and react-router-dom ES modules
            jestConfig.transformIgnorePatterns = [
                'node_modules/(?!(fast-check|axios|react-router-dom|react-router)/)',
            ];
            return jestConfig;
        },
    },
};
