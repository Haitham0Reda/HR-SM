const path = require('path');

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  staticDirs: ["..\\public"],
  webpackFinal: async (config) => {
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
