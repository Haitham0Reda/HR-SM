import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Chip, 
  Grid, 
  Paper,
  Avatar,
  LinearProgress
} from '@mui/material';
import { gradients, shadows } from './platformTheme';

export default {
  title: '2. Platform Admin/Theme/Design System',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Complete design system showcase for the Platform Administration interface, featuring modern gradients, shadows, and component styling.',
      },
    },
  },
  tags: ['autodocs'],
};

const ColorPalette = () => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="h4" gutterBottom>Color Palette</Typography>
    </Grid>
    {['primary', 'secondary', 'success', 'error', 'warning', 'info'].map((color) => (
      <Grid item xs={12} sm={6} md={4} key={color}>
        <Card>
          <Box 
            sx={{ 
              height: 100, 
              background: `var(--mui-palette-${color}-main)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h6" color="white" sx={{ textTransform: 'capitalize' }}>
              {color}
            </Typography>
          </Box>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {color} color with light and dark variants
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const GradientShowcase = () => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="h4" gutterBottom>Gradient System</Typography>
    </Grid>
    {Object.entries(gradients).map(([name, gradient]) => (
      <Grid item xs={12} sm={6} md={4} key={name}>
        <Card>
          <Box 
            sx={{ 
              height: 100, 
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h6" color="white" sx={{ textTransform: 'capitalize' }}>
              {name}
            </Typography>
          </Box>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {gradient.length > 50 ? `${gradient.substring(0, 50)}...` : gradient}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

const ComponentShowcase = () => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="h4" gutterBottom>Component Styling</Typography>
    </Grid>
    
    {/* Buttons */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Buttons</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Button variant="contained">Primary</Button>
            <Button variant="outlined">Outlined</Button>
            <Button variant="text">Text</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" color="secondary">Secondary</Button>
            <Button variant="contained" color="success">Success</Button>
            <Button variant="contained" color="error">Error</Button>
          </Box>
        </CardContent>
      </Card>
    </Grid>

    {/* Chips */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Chips</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label="Active" color="success" />
            <Chip label="Pending" color="warning" />
            <Chip label="Inactive" color="error" />
            <Chip label="Draft" color="default" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Enterprise" color="primary" variant="outlined" />
            <Chip label="Professional" color="secondary" variant="outlined" />
            <Chip label="Basic" color="info" variant="outlined" />
          </Box>
        </CardContent>
      </Card>
    </Grid>

    {/* Progress */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Progress Indicators</Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>System Load</Typography>
            <LinearProgress variant="determinate" value={75} sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>Memory Usage</Typography>
            <LinearProgress variant="determinate" value={60} color="success" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>Disk Usage</Typography>
            <LinearProgress variant="determinate" value={90} color="warning" />
          </Box>
        </CardContent>
      </Card>
    </Grid>

    {/* Avatars */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Avatars</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>TC</Avatar>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>HP</Avatar>
            <Avatar sx={{ bgcolor: 'success.main' }}>GM</Avatar>
            <Avatar sx={{ bgcolor: 'error.main' }}>EC</Avatar>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

export const ColorSystem = () => (
  <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
    <ColorPalette />
  </Box>
);

export const Gradients = () => (
  <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
    <GradientShowcase />
  </Box>
);

export const Components = () => (
  <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
    <ComponentShowcase />
  </Box>
);

export const FullShowcase = () => (
  <Box sx={{ p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
    <Typography variant="h2" gutterBottom sx={{ mb: 4 }}>
      Platform Design System
    </Typography>
    <Box sx={{ mb: 6 }}>
      <ColorPalette />
    </Box>
    <Box sx={{ mb: 6 }}>
      <GradientShowcase />
    </Box>
    <Box>
      <ComponentShowcase />
    </Box>
  </Box>
);