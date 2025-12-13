import React from 'react';
import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import LoadingAnimation from './LoadingAnimation';
import { ThemeProvider } from '../contexts/ThemeContext';

export default {
  title: '2. Platform Admin/Components/LoadingAnimation',
  component: LoadingAnimation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Loading Animation Component

A versatile loading animation component with multiple variants for different use cases.

## Variants
- **Circular**: Standard Material-UI circular progress with text
- **Dots**: Bouncing dots animation with customizable message
- **Pulse**: Pulsing circle animation for subtle loading states

## Props
- \`message\`: Custom loading message (default: "Loading...")
- \`variant\`: Animation type - "circular", "dots", or "pulse"

## Usage
Perfect for form submissions, data loading, and async operations.
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Box sx={{ p: 4 }}>
          <Story />
        </Box>
      </ThemeProvider>
    ),
  ],
};

export const Circular = () => (
  <LoadingAnimation message="Signing in..." variant="circular" />
);

export const Dots = () => (
  <LoadingAnimation message="Processing" variant="dots" />
);

export const Pulse = () => (
  <LoadingAnimation message="Loading data" variant="pulse" />
);

export const AllVariants = () => (
  <Stack spacing={4}>
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Circular Progress
        </Typography>
        <LoadingAnimation message="Authenticating user..." variant="circular" />
      </CardContent>
    </Card>
    
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Bouncing Dots
        </Typography>
        <LoadingAnimation message="Fetching dashboard data" variant="dots" />
      </CardContent>
    </Card>
    
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Pulse Animation
        </Typography>
        <LoadingAnimation message="Connecting to server" variant="pulse" />
      </CardContent>
    </Card>
  </Stack>
);

export const CustomMessages = () => (
  <Stack spacing={3}>
    <LoadingAnimation message="Validating credentials..." variant="circular" />
    <LoadingAnimation message="Preparing workspace" variant="dots" />
    <LoadingAnimation message="Almost ready" variant="pulse" />
  </Stack>
);