import React from 'react';
import { ThemeConfigProvider } from '../src/context/ThemeContext';
import { MemoryRouter } from 'react-router-dom';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#f8f9fa',
        },
        {
          name: 'dark',
          value: '#1a1d23',
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <ThemeConfigProvider>
          <div style={{ padding: '20px' }}>
            <Story />
          </div>
        </ThemeConfigProvider>
      </MemoryRouter>
    ),
  ],
};

export default preview;
