import React from 'react';
import { CssBaseline } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Import theme providers
let HRThemeConfigProvider;
let PlatformThemeProvider;

try {
  HRThemeConfigProvider = require('../hr-app/src/context/ThemeContext').ThemeConfigProvider;
} catch (e) {
  console.warn('HR app theme context not found');
  HRThemeConfigProvider = null;
}

try {
  PlatformThemeProvider = require('../platform-admin/src/contexts/ThemeContext').ThemeProvider;
} catch (e) {
  console.warn('Platform admin theme context not found');
  PlatformThemeProvider = null;
}

// Universal theme wrapper that provides both theme contexts
const UniversalThemeProvider = ({ children }) => {
  if (PlatformThemeProvider && HRThemeConfigProvider) {
    return (
      <PlatformThemeProvider>
        <HRThemeConfigProvider>
          <CssBaseline />
          {children}
        </HRThemeConfigProvider>
      </PlatformThemeProvider>
    );
  } else if (PlatformThemeProvider) {
    return (
      <PlatformThemeProvider>
        <CssBaseline />
        {children}
      </PlatformThemeProvider>
    );
  } else if (HRThemeConfigProvider) {
    return (
      <HRThemeConfigProvider>
        <CssBaseline />
        {children}
      </HRThemeConfigProvider>
    );
  } else {
    // Fallback to basic Material-UI theme
    const { ThemeProvider } = require('@mui/material/styles');
    const platformTheme = require('../platform-admin/src/theme/platformTheme').default;
    return (
      <ThemeProvider theme={platformTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    );
  }
};

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
        <UniversalThemeProvider>
          <div style={{ padding: '20px' }}>
            <Story />
          </div>
        </UniversalThemeProvider>
      </MemoryRouter>
    ),
  ],
};

export default preview;
