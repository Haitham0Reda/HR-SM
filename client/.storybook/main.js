const path = require('path');

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: [
    "../hr-app/src/**/*.mdx", 
    "../hr-app/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../platform-admin/src/**/*.mdx", 
    "../platform-admin/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "./*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/addon-docs",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  staticDirs: ["../hr-app/public", "../platform-admin/public"],
  webpackFinal: async (config) => {
    // Add alias for components
    config.resolve.alias = {
      ...config.resolve.alias,
      '@hr-app': path.resolve(__dirname, '../hr-app/src'),
      '@platform-admin': path.resolve(__dirname, '../platform-admin/src'),
    };

    // Ensure babel-loader processes JSX files with our .babelrc
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          babelrc: true,
          configFile: path.resolve(__dirname, '../.babelrc'),
        },
      },
    });

    config.resolve.extensions.push('.js', '.jsx');
    
    return config;
  },
};

module.exports = config;
