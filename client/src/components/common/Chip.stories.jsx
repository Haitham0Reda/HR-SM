import React from 'react';
import Chip, { StatusChip } from './Chip';
import { Avatar } from '@mui/material';
import { Face, Done, Close } from '@mui/icons-material';

export default {
  title: 'Base Components/Chip',
  component: Chip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['filled', 'outlined'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    color: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'],
    },
  },
};

// Default chip
export const Default = {
  args: {
    label: 'Chip',
  },
};

// All variants
export const Variants = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Chip label="Filled" variant="filled" />
    <Chip label="Outlined" variant="outlined" />
  </div>
);

// All sizes
export const Sizes = () => (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
    <Chip label="Small" size="small" />
    <Chip label="Medium" size="medium" />
  </div>
);

// All colors
export const Colors = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Chip label="Default" color="default" />
    <Chip label="Primary" color="primary" />
    <Chip label="Secondary" color="secondary" />
    <Chip label="Success" color="success" />
    <Chip label="Error" color="error" />
    <Chip label="Warning" color="warning" />
    <Chip label="Info" color="info" />
  </div>
);

// Outlined colors
export const OutlinedColors = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Chip label="Default" color="default" variant="outlined" />
    <Chip label="Primary" color="primary" variant="outlined" />
    <Chip label="Secondary" color="secondary" variant="outlined" />
    <Chip label="Success" color="success" variant="outlined" />
    <Chip label="Error" color="error" variant="outlined" />
    <Chip label="Warning" color="warning" variant="outlined" />
    <Chip label="Info" color="info" variant="outlined" />
  </div>
);

// With icons
export const WithIcons = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Chip label="With Icon" icon={<Done />} color="success" />
    <Chip label="With Icon" icon={<Close />} color="error" />
    <Chip label="With Icon" icon={<Face />} color="primary" />
  </div>
);

// With avatar
export const WithAvatar = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Chip 
      label="John Doe" 
      avatar={<Avatar>JD</Avatar>}
      color="primary"
    />
    <Chip 
      label="Jane Smith" 
      avatar={<Avatar>JS</Avatar>}
      color="secondary"
    />
    <Chip 
      label="User" 
      avatar={<Avatar><Face /></Avatar>}
    />
  </div>
);

// Deletable chips
export const Deletable = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Chip 
      label="Deletable" 
      onDelete={() => alert('Delete clicked')}
      color="primary"
    />
    <Chip 
      label="Remove Me" 
      onDelete={() => alert('Delete clicked')}
      color="error"
      variant="outlined"
    />
    <Chip 
      label="Tag" 
      onDelete={() => alert('Delete clicked')}
      size="small"
    />
  </div>
);

// Clickable chips
export const Clickable = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Chip 
      label="Click Me" 
      onClick={() => alert('Chip clicked')}
      color="primary"
    />
    <Chip 
      label="Interactive" 
      onClick={() => alert('Chip clicked')}
      color="secondary"
      variant="outlined"
    />
    <Chip 
      label="Action" 
      onClick={() => alert('Chip clicked')}
      icon={<Done />}
      color="success"
    />
  </div>
);

// Status chips
export const StatusChips = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <StatusChip status="active" />
    <StatusChip status="inactive" />
    <StatusChip status="pending" />
    <StatusChip status="approved" />
    <StatusChip status="rejected" />
    <StatusChip status="cancelled" />
  </div>
);

// Tag collection
export const TagCollection = () => (
  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '400px' }}>
    <Chip label="React" size="small" color="primary" />
    <Chip label="JavaScript" size="small" color="warning" />
    <Chip label="TypeScript" size="small" color="info" />
    <Chip label="Node.js" size="small" color="success" />
    <Chip label="Material-UI" size="small" color="secondary" />
    <Chip label="Design System" size="small" color="primary" variant="outlined" />
    <Chip label="Frontend" size="small" color="info" variant="outlined" />
    <Chip label="Backend" size="small" color="success" variant="outlined" />
  </div>
);

// User chips with delete
export const UserChips = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div>
      <h4 style={{ marginBottom: '8px' }}>Team Members</h4>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Chip 
          label="John Doe" 
          avatar={<Avatar>JD</Avatar>}
          onDelete={() => alert('Remove John')}
          color="primary"
        />
        <Chip 
          label="Jane Smith" 
          avatar={<Avatar>JS</Avatar>}
          onDelete={() => alert('Remove Jane')}
          color="primary"
        />
        <Chip 
          label="Bob Johnson" 
          avatar={<Avatar>BJ</Avatar>}
          onDelete={() => alert('Remove Bob')}
          color="primary"
        />
      </div>
    </div>
  </div>
);

// Filter chips
export const FilterChips = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
    <div>
      <h4 style={{ marginBottom: '8px' }}>Active Filters</h4>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Chip 
          label="Status: Active" 
          onDelete={() => alert('Remove filter')}
          color="success"
          size="small"
        />
        <Chip 
          label="Department: Engineering" 
          onDelete={() => alert('Remove filter')}
          color="primary"
          size="small"
        />
        <Chip 
          label="Location: Remote" 
          onDelete={() => alert('Remove filter')}
          color="info"
          size="small"
        />
      </div>
    </div>
  </div>
);

// All states showcase
export const AllStates = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '600px' }}>
    <div>
      <h3 style={{ marginBottom: '16px' }}>Filled Chips</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Chip label="Default" color="default" />
        <Chip label="Primary" color="primary" />
        <Chip label="Secondary" color="secondary" />
        <Chip label="Success" color="success" />
        <Chip label="Error" color="error" />
        <Chip label="Warning" color="warning" />
        <Chip label="Info" color="info" />
      </div>
    </div>
    
    <div>
      <h3 style={{ marginBottom: '16px' }}>Outlined Chips</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Chip label="Default" color="default" variant="outlined" />
        <Chip label="Primary" color="primary" variant="outlined" />
        <Chip label="Secondary" color="secondary" variant="outlined" />
        <Chip label="Success" color="success" variant="outlined" />
        <Chip label="Error" color="error" variant="outlined" />
        <Chip label="Warning" color="warning" variant="outlined" />
        <Chip label="Info" color="info" variant="outlined" />
      </div>
    </div>
    
    <div>
      <h3 style={{ marginBottom: '16px' }}>With Icons</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Chip label="Success" icon={<Done />} color="success" />
        <Chip label="Error" icon={<Close />} color="error" />
        <Chip label="User" icon={<Face />} color="primary" />
      </div>
    </div>
    
    <div>
      <h3 style={{ marginBottom: '16px' }}>Status Chips</h3>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <StatusChip status="active" />
        <StatusChip status="inactive" />
        <StatusChip status="pending" />
        <StatusChip status="approved" />
        <StatusChip status="rejected" />
        <StatusChip status="cancelled" />
      </div>
    </div>
  </div>
);
