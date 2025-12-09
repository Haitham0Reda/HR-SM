import React from 'react';
import Button from './Button';
import { Add, Delete, Edit, Save } from '@mui/icons-material';

export default {
  title: 'Base Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['contained', 'outlined', 'text'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
};

// Default button
export const Default = {
  args: {
    children: 'Button',
    variant: 'contained',
    size: 'medium',
    color: 'primary',
  },
};

// All variants
export const Variants = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Button variant="contained">Contained</Button>
    <Button variant="outlined">Outlined</Button>
    <Button variant="text">Text</Button>
  </div>
);

// All sizes
export const Sizes = () => (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
    <Button size="small">Small</Button>
    <Button size="medium">Medium</Button>
    <Button size="large">Large</Button>
  </div>
);

// All colors
export const Colors = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Button color="primary">Primary</Button>
    <Button color="secondary">Secondary</Button>
    <Button color="success">Success</Button>
    <Button color="error">Error</Button>
    <Button color="warning">Warning</Button>
    <Button color="info">Info</Button>
  </div>
);

// With icons
export const WithIcons = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Button startIcon={<Add />}>Add Item</Button>
    <Button startIcon={<Edit />} variant="outlined">Edit</Button>
    <Button startIcon={<Delete />} color="error">Delete</Button>
    <Button endIcon={<Save />} color="success">Save</Button>
  </div>
);

// Loading state
export const Loading = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Button loading>Loading</Button>
    <Button loading variant="outlined">Loading</Button>
    <Button loading size="small">Small Loading</Button>
    <Button loading size="large">Large Loading</Button>
  </div>
);

// Disabled state
export const Disabled = () => (
  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
    <Button disabled>Disabled</Button>
    <Button disabled variant="outlined">Disabled</Button>
    <Button disabled variant="text">Disabled</Button>
  </div>
);

// Full width
export const FullWidth = () => (
  <div style={{ width: '400px' }}>
    <Button fullWidth>Full Width Button</Button>
  </div>
);

// All states showcase
export const AllStates = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '600px' }}>
    <div>
      <h3 style={{ marginBottom: '16px' }}>Contained Buttons</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary">Primary</Button>
        <Button variant="contained" color="secondary">Secondary</Button>
        <Button variant="contained" color="success">Success</Button>
        <Button variant="contained" color="error">Error</Button>
        <Button variant="contained" color="warning">Warning</Button>
        <Button variant="contained" color="info">Info</Button>
      </div>
    </div>
    
    <div>
      <h3 style={{ marginBottom: '16px' }}>Outlined Buttons</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Button variant="outlined" color="primary">Primary</Button>
        <Button variant="outlined" color="secondary">Secondary</Button>
        <Button variant="outlined" color="success">Success</Button>
        <Button variant="outlined" color="error">Error</Button>
        <Button variant="outlined" color="warning">Warning</Button>
        <Button variant="outlined" color="info">Info</Button>
      </div>
    </div>
    
    <div>
      <h3 style={{ marginBottom: '16px' }}>Text Buttons</h3>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Button variant="text" color="primary">Primary</Button>
        <Button variant="text" color="secondary">Secondary</Button>
        <Button variant="text" color="success">Success</Button>
        <Button variant="text" color="error">Error</Button>
        <Button variant="text" color="warning">Warning</Button>
        <Button variant="text" color="info">Info</Button>
      </div>
    </div>
  </div>
);
