module.exports = {
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
};
