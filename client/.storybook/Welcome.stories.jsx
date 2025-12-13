import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Palette as PaletteIcon,
  Code as CodeIcon,
  ViewModule as ViewModuleIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

export default {
  title: '! Welcome/Getting Started',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Welcome to the HR Management Platform Storybook - your unified component library and design system.',
      },
    },
  },
  tags: ['autodocs'],
};

const FeatureCard = ({ icon, title, description, items }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      <List dense>
        {items.map((item, index) => (
          <ListItem key={index} sx={{ px: 0 }}>
            <ListItemText 
              primary={item}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        ))}
      </List>
    </CardContent>
  </Card>
);

export const Welcome = () => (
  <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
    {/* Header */}
    <Box sx={{ 
      textAlign: 'center', 
      mb: 6,
      py: 6,
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 50%, rgba(217, 70, 239, 0.05) 100%)',
      borderRadius: 4,
      border: '1px solid',
      borderColor: 'divider'
    }}>
      <Typography variant="h1" gutterBottom sx={{ 
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 800,
        fontSize: { xs: '2.5rem', md: '4rem' },
        mb: 2,
        textAlign: 'center'
      }}>
        🏠 Welcome to Storybook
      </Typography>
      <Typography variant="h4" color="text.primary" gutterBottom sx={{ fontWeight: 600 }}>
        HR Management Platform
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 400 }}>
        Unified Component Library & Design System
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', mb: 4, fontSize: '1.1rem' }}>
        Explore our comprehensive collection of components, templates, and design patterns 
        for both the HR Application and Platform Administration interfaces. Built with modern 
        technologies and best practices.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
        <Chip label="React 19" color="primary" size="medium" />
        <Chip label="Material-UI 7" color="secondary" size="medium" />
        <Chip label="Storybook 8" color="success" size="medium" />
        <Chip label="Modern Design" color="info" size="medium" />
        <Chip label="TypeScript" color="warning" size="medium" />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        Start exploring by browsing the sidebar navigation →
      </Typography>
    </Box>

    {/* Quick Navigation */}
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        Quick Navigation
      </Typography>
      <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
            border: '1px solid',
            borderColor: 'primary.main',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-2px)' }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">HR Application Components</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Employee management, dashboards, forms, and business logic components
              </Typography>
              <Button variant="outlined" size="small">
                Browse HR Components →
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%)',
            border: '1px solid',
            borderColor: 'secondary.main',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-2px)' }
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Platform Admin Components</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Multi-tenant management, system administration, and platform configuration
              </Typography>
              <Button variant="outlined" color="secondary" size="small">
                Browse Platform Components →
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>

    {/* Features Grid */}
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        What's Included
      </Typography>
      <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<ViewModuleIcon color="primary" />}
            title="Base Components"
            description="Foundational UI components with consistent styling and behavior"
            items={[
              'Buttons with hover animations',
              'Form inputs with validation',
              'Cards with modern shadows',
              'Data tables with sorting',
              'Modal dialogs and overlays'
            ]}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<DashboardIcon color="success" />}
            title="Composite Components"
            description="Complex components built from base components for specific use cases"
            items={[
              'Statistics cards with trends',
              'User profile cards',
              'Action cards with CTAs',
              'Form sections with grouping',
              'Dashboard widgets'
            ]}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<CodeIcon color="info" />}
            title="Page Templates"
            description="Complete page layouts and templates for common patterns"
            items={[
              'List pages with filters',
              'Detail pages with tabs',
              'Form pages with validation',
              'Dashboard layouts',
              'Multi-step wizards'
            ]}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<PaletteIcon color="secondary" />}
            title="Design System"
            description="Modern design tokens, gradients, and theming system"
            items={[
              'Light and dark mode support',
              'Modern gradient system',
              'Consistent spacing scale',
              'Typography hierarchy',
              'Color palette with variants'
            ]}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<SecurityIcon color="warning" />}
            title="License Components"
            description="Feature licensing and access control components"
            items={[
              'Locked feature overlays',
              'Upgrade prompts and modals',
              'Usage warning banners',
              'License status indicators',
              'Feature gate components'
            ]}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FeatureCard
            icon={<BusinessIcon color="error" />}
            title="Platform Features"
            description="Multi-tenant and platform administration components"
            items={[
              'Tenant management interfaces',
              'System health monitoring',
              'Usage metrics dashboards',
              'Subscription management',
              'Theme configuration'
            ]}
          />
        </Grid>
      </Grid>
    </Box>

    {/* Stats */}
    <Box sx={{ mb: 6 }}>
      <Grid container spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="primary.main" sx={{ fontWeight: 700 }}>
              50+
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Components
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 700 }}>
              2
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Applications
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="success.main" sx={{ fontWeight: 700 }}>
              100%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Responsive
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h3" color="info.main" sx={{ fontWeight: 700 }}>
              A11y
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Accessible
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>

    {/* Getting Started */}
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Getting Started
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
        Use the sidebar navigation to explore components by category. Each component includes 
        interactive examples, documentation, and code snippets.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" size="large" sx={{ 
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          }
        }}>
          Browse Components
        </Button>
        <Button variant="outlined" size="large">
          View Documentation
        </Button>
      </Box>
    </Box>
  </Box>
);

Welcome.parameters = {
  layout: 'fullscreen',
};