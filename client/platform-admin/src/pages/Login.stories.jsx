import React from 'react';
import { Box } from '@mui/material';
import Login from './Login';
import { ThemeProvider } from '../contexts/ThemeContext';

export default {
  title: '2. Platform Admin/Pages/Login',
  component: Login,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Animated Login Page

A modern, fully animated login page for the Platform Administration interface featuring:

## ✨ Key Features
- **Smooth Animations**: CSS keyframe animations for floating elements and transitions
- **Responsive Design**: Adapts beautifully to all screen sizes
- **Interactive Elements**: Hover effects, focus states, and micro-interactions
- **Dark/Light Mode**: Full theme support with appropriate color schemes
- **Form Validation**: Real-time validation with animated error states
- **Loading States**: Elegant loading animations during authentication

## 🎨 Design Elements
- **Animated Background**: Floating geometric shapes and particles
- **Split Layout**: Branding section with feature highlights
- **Modern Form**: Clean inputs with icons and smooth transitions
- **Gradient Backgrounds**: Beautiful gradient overlays
- **Micro-interactions**: Button hover effects and input focus animations

## 🔐 Demo Credentials
- **Email**: admin@platform.com
- **Password**: admin123

## 📱 Responsive Features
- **Desktop**: Full split-screen layout with branding
- **Tablet**: Optimized layout with adjusted spacing
- **Mobile**: Single-column layout with touch-friendly interactions
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export const Default = () => <Login />;

export const LightMode = () => (
  <Box sx={{ 
    '& *': {
      colorScheme: 'light'
    }
  }}>
    <Login />
  </Box>
);

LightMode.parameters = {
  backgrounds: { default: 'light' },
  docs: {
    description: {
      story: 'Login page in light mode with gradient background and clean form design.',
    },
  },
};

export const DarkMode = () => (
  <Box sx={{ 
    '& *': {
      colorScheme: 'dark'
    }
  }}>
    <Login />
  </Box>
);

DarkMode.parameters = {
  backgrounds: { default: 'dark' },
  docs: {
    description: {
      story: 'Login page in dark mode with dark gradient background and enhanced contrast.',
    },
  },
};

export const MobileView = () => <Login />;

MobileView.parameters = {
  viewport: {
    defaultViewport: 'mobile1',
  },
  docs: {
    description: {
      story: 'Login page optimized for mobile devices with responsive design and touch-friendly interactions.',
    },
  },
};

export const TabletView = () => <Login />;

TabletView.parameters = {
  viewport: {
    defaultViewport: 'tablet',
  },
  docs: {
    description: {
      story: 'Login page on tablet devices showing the responsive layout adaptation.',
    },
  },
};