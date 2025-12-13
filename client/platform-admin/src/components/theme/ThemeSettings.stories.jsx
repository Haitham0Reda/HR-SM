import React from 'react';
import { Box } from '@mui/material';
import ThemeSettings from './ThemeSettings';

export default {
  title: 'Platform Admin/Theme/ThemeSettings',
  component: ThemeSettings,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Theme configuration component for platform-wide theme settings including color schemes, gradients, and visual preferences.',
      },
    },
  },
  tags: ['autodocs'],
};

export const Default = () => (
  <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
    <ThemeSettings />
  </Box>
);

export const Compact = () => (
  <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
    <ThemeSettings />
  </Box>
);

export const FullWidth = () => (
  <Box sx={{ p: 4 }}>
    <ThemeSettings />
  </Box>
);