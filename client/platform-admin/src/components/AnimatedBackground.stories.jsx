import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import AnimatedBackground from './AnimatedBackground';
import { ThemeProvider } from '../contexts/ThemeContext';

export default {
  title: '2. Platform Admin/Components/AnimatedBackground',
  component: AnimatedBackground,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Animated Background Component

A sophisticated animated background component featuring multiple layers of animations and effects:

## ✨ Animation Features
- **Floating Circles**: Large gradient circles with nested pulsing effects
- **Morphing Shapes**: Dynamic shapes that change form and rotate continuously
- **Particle System**: 30+ animated particles with varying sizes, colors, and movement patterns
- **Sparkle Effects**: Twinkling star-like elements that appear and disappear
- **Zigzag Elements**: Moving elements that follow zigzag paths across the screen
- **Wave Effects**: Horizontal wave animations that sweep across the background
- **Dynamic Grid**: Animated grid pattern with rotating diagonal overlays
- **Geometric Shapes**: Rotating squares, diamonds, and triangles
- **Connecting Lines**: Animated lines that create visual connections
- **Animated Orbs**: Blurred morphing orbs that drift across the screen

## 🎨 Visual Effects
- **Gradient Overlays**: Multi-color radial and linear gradients
- **Blur Effects**: Subtle blur filters for depth
- **Opacity Variations**: Dynamic opacity changes for breathing effects
- **Color Transitions**: Smooth color transitions between theme colors
- **Layered Animations**: Multiple animation layers for rich visual depth

## 🔧 Technical Features
- **Theme Integration**: Automatically adapts to light/dark themes
- **Performance Optimized**: CSS animations for smooth 60fps performance
- **Responsive Design**: Scales appropriately on all screen sizes
- **Customizable**: Easy to modify colors, timing, and effects
- **Accessibility Friendly**: Respects user motion preferences

## 📱 Usage
Perfect for login pages, landing pages, or any interface that needs an engaging animated background.
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

export const Default = () => (
  <AnimatedBackground>
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4
      }}
    >
      <Card
        sx={{
          maxWidth: 600,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white'
        }}
      >
        <CardContent sx={{ textAlign: 'center', p: 6 }}>
          <Typography variant="h3" gutterBottom fontWeight="bold">
            Animated Background
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 3 }}>
            Watch the beautiful animations in the background
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.8 }}>
            This component features multiple layers of animations including floating circles, 
            morphing shapes, particle systems, sparkle effects, wave animations, and more.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  </AnimatedBackground>
);

export const LightTheme = () => (
  <Box sx={{ '& *': { colorScheme: 'light' } }}>
    <AnimatedBackground>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4
        }}
      >
        <Card sx={{ maxWidth: 600, backgroundColor: 'background.paper' }}>
          <CardContent sx={{ textAlign: 'center', p: 6 }}>
            <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
              Light Theme
            </Typography>
            <Typography variant="body1" color="text.secondary">
              The animated background adapts beautifully to light themes with 
              vibrant gradients and colorful animations.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </AnimatedBackground>
  </Box>
);

LightTheme.parameters = {
  backgrounds: { default: 'light' },
  docs: {
    description: {
      story: 'Animated background in light theme mode with bright, vibrant colors and gradients.',
    },
  },
};

export const DarkTheme = () => (
  <Box sx={{ '& *': { colorScheme: 'dark' } }}>
    <AnimatedBackground>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4
        }}
      >
        <Card
          sx={{
            maxWidth: 600,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }}
        >
          <CardContent sx={{ textAlign: 'center', p: 6 }}>
            <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
              Dark Theme
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              In dark mode, the background features deep gradients and 
              subtle glowing effects that create an immersive experience.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </AnimatedBackground>
  </Box>
);

DarkTheme.parameters = {
  backgrounds: { default: 'dark' },
  docs: {
    description: {
      story: 'Animated background in dark theme mode with deep gradients and glowing effects.',
    },
  },
};

export const MinimalContent = () => (
  <AnimatedBackground>
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Typography
        variant="h2"
        sx={{
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          opacity: 0.9
        }}
      >
        Pure Animation
      </Typography>
    </Box>
  </AnimatedBackground>
);

MinimalContent.parameters = {
  docs: {
    description: {
      story: 'Animated background with minimal content to showcase the pure animation effects.',
    },
  },
};

export const FullscreenDemo = () => (
  <AnimatedBackground>
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 4,
        color: 'white'
      }}
    >
      <Typography variant="h3" fontWeight="bold" textAlign="center">
        Fullscreen Animation Demo
      </Typography>
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Multiple Animation Layers
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: 600 }}>
          Experience the full range of animations including floating elements, 
          morphing shapes, particle systems, wave effects, and dynamic patterns 
          all working together in harmony.
        </Typography>
      </Box>
      
      <Typography variant="body2" sx={{ opacity: 0.6 }}>
        Scroll to see how animations adapt to different viewport sizes
      </Typography>
    </Box>
  </AnimatedBackground>
);

FullscreenDemo.parameters = {
  docs: {
    description: {
      story: 'Full demonstration of all animation features in a fullscreen layout.',
    },
  },
};