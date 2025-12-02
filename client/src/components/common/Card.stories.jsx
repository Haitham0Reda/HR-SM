import React from 'react';
import Card from './Card';
import Button from './Button';
import { IconButton, Typography, Avatar, Box } from '@mui/material';
import { MoreVert, Favorite, Share, Person } from '@mui/icons-material';

export default {
  title: 'Base Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    hover: {
      control: 'boolean',
    },
    elevation: {
      control: { type: 'range', min: 0, max: 24, step: 1 },
    },
  },
};

// Default card
export const Default = {
  args: {
    children: (
      <Typography>
        This is a basic card with default styling. It includes consistent border radius,
        padding, and shadow effects.
      </Typography>
    ),
  },
};

// Card with title
export const WithTitle = () => (
  <Card title="Card Title">
    <Typography>
      This card has a title in the header. The title uses consistent typography
      from the design system.
    </Typography>
  </Card>
);

// Card with title and subtitle
export const WithTitleAndSubtitle = () => (
  <Card 
    title="Card Title" 
    subtitle="Card subtitle provides additional context"
  >
    <Typography>
      This card includes both a title and subtitle in the header section.
    </Typography>
  </Card>
);

// Card with action
export const WithAction = () => (
  <Card 
    title="Card with Action" 
    subtitle="Click the menu icon"
    action={
      <IconButton>
        <MoreVert />
      </IconButton>
    }
  >
    <Typography>
      This card has an action button in the header, typically used for menus or
      additional options.
    </Typography>
  </Card>
);

// Card with actions
export const WithActions = () => (
  <Card 
    title="Card with Actions" 
    subtitle="Multiple action buttons at the bottom"
    actions={
      <>
        <Button variant="text" startIcon={<Favorite />}>Like</Button>
        <Button variant="text" startIcon={<Share />}>Share</Button>
      </>
    }
  >
    <Typography>
      This card includes action buttons at the bottom, commonly used for
      interactive cards.
    </Typography>
  </Card>
);

// Hover effect
export const HoverEffect = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Card hover title="Hover Me">
      <Typography>
        This card has a hover effect. Move your mouse over it to see the
        elevation and border color change.
      </Typography>
    </Card>
    <Card title="No Hover">
      <Typography>
        This card does not have a hover effect for comparison.
      </Typography>
    </Card>
  </div>
);

// Different elevations
export const Elevations = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Card elevation={0} title="Elevation 0">
      <Typography>No shadow</Typography>
    </Card>
    <Card elevation={1} title="Elevation 1">
      <Typography>Subtle shadow</Typography>
    </Card>
    <Card elevation={3} title="Elevation 3">
      <Typography>Medium shadow</Typography>
    </Card>
    <Card elevation={8} title="Elevation 8">
      <Typography>Strong shadow</Typography>
    </Card>
  </div>
);

// User profile card
export const UserProfileCard = () => (
  <Card 
    title="John Doe" 
    subtitle="Software Engineer"
    action={
      <IconButton>
        <MoreVert />
      </IconButton>
    }
    actions={
      <>
        <Button variant="outlined" size="small">Message</Button>
        <Button variant="contained" size="small">Follow</Button>
      </>
    }
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Avatar sx={{ width: 64, height: 64 }}>
        <Person />
      </Avatar>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Email: john.doe@example.com
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Location: San Francisco, CA
        </Typography>
      </Box>
    </Box>
    <Typography variant="body2">
      Passionate about building great user experiences and scalable applications.
      Love working with React and modern web technologies.
    </Typography>
  </Card>
);

// Stats card
export const StatsCard = () => (
  <Card hover>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h3" color="primary" sx={{ mb: 1 }}>
        1,234
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Total Users
      </Typography>
      <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
        ↑ 12% from last month
      </Typography>
    </Box>
  </Card>
);

// Content card
export const ContentCard = () => (
  <Card 
    title="Getting Started with Design System" 
    subtitle="Posted on December 2, 2025"
    hover
    actions={
      <>
        <Button variant="text">Read More</Button>
        <Button variant="text" startIcon={<Share />}>Share</Button>
      </>
    }
  >
    <Typography paragraph>
      Our unified design system provides a comprehensive set of components and
      guidelines to ensure consistency across all pages and features.
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Learn how to use the design system components, understand the design tokens,
      and follow best practices for building new features.
    </Typography>
  </Card>
);

// Multiple cards layout
export const MultipleCards = () => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    width: '100%',
    maxWidth: '1200px'
  }}>
    <Card title="Card 1" hover>
      <Typography>First card with hover effect</Typography>
    </Card>
    <Card title="Card 2" hover>
      <Typography>Second card with hover effect</Typography>
    </Card>
    <Card title="Card 3" hover>
      <Typography>Third card with hover effect</Typography>
    </Card>
    <Card title="Card 4" hover>
      <Typography>Fourth card with hover effect</Typography>
    </Card>
  </div>
);
