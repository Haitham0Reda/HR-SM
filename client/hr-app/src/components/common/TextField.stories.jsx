import React, { useState } from 'react';
import TextField from './TextField';
import { InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff, Search, Email } from '@mui/icons-material';

export default {
  title: 'Base Components/TextField',
  component: TextField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'standard'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    error: {
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

// Default text field
export const Default = {
  args: {
    label: 'Label',
    placeholder: 'Enter text...',
  },
};

// All variants
export const Variants = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
    <TextField label="Outlined" variant="outlined" placeholder="Outlined variant" />
    <TextField label="Filled" variant="filled" placeholder="Filled variant" />
    <TextField label="Standard" variant="standard" placeholder="Standard variant" />
  </div>
);

// All sizes
export const Sizes = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
    <TextField label="Small" size="small" placeholder="Small size" />
    <TextField label="Medium" size="medium" placeholder="Medium size" />
  </div>
);

// With helper text
export const WithHelperText = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
    <TextField 
      label="Username" 
      helperText="Enter your username"
      placeholder="john.doe"
    />
    <TextField 
      label="Email" 
      type="email"
      helperText="We'll never share your email"
      placeholder="john@example.com"
    />
  </div>
);

// Error state
export const ErrorState = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
    <TextField 
      label="Email" 
      error
      helperText="Invalid email address"
      defaultValue="invalid-email"
    />
    <TextField 
      label="Password" 
      type="password"
      error
      helperText="Password must be at least 8 characters"
      defaultValue="123"
    />
  </div>
);

// Disabled state
export const Disabled = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
    <TextField 
      label="Disabled" 
      disabled
      defaultValue="Cannot edit this"
    />
    <TextField 
      label="Disabled with value" 
      disabled
      defaultValue="Read-only value"
      helperText="This field is disabled"
    />
  </div>
);

// With icons
export const WithIcons = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
    <TextField 
      label="Search" 
      placeholder="Search..."
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search />
          </InputAdornment>
        ),
      }}
    />
    <TextField 
      label="Email" 
      type="email"
      placeholder="john@example.com"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Email />
          </InputAdornment>
        ),
      }}
    />
  </div>
);

// Password field with toggle
export const PasswordField = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ width: '300px' }}>
      <TextField 
        label="Password" 
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter password"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </div>
  );
};

// Multiline
export const Multiline = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '400px' }}>
    <TextField 
      label="Description" 
      multiline
      rows={4}
      placeholder="Enter description..."
      helperText="Maximum 500 characters"
    />
    <TextField 
      label="Comments" 
      multiline
      minRows={2}
      maxRows={6}
      placeholder="Enter comments..."
      helperText="Auto-expanding text area"
    />
  </div>
);

// Required field
export const Required = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
    <TextField 
      label="Name" 
      required
      placeholder="Enter your name"
      helperText="This field is required"
    />
    <TextField 
      label="Email" 
      type="email"
      required
      placeholder="john@example.com"
      helperText="Required field"
    />
  </div>
);

// Full width
export const FullWidth = () => (
  <div style={{ width: '600px' }}>
    <TextField 
      label="Full Width Field" 
      fullWidth
      placeholder="This field spans the full width"
      helperText="Full width text field"
    />
  </div>
);

// Form example
export const FormExample = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '400px' }}>
    <TextField 
      label="First Name" 
      required
      placeholder="John"
    />
    <TextField 
      label="Last Name" 
      required
      placeholder="Doe"
    />
    <TextField 
      label="Email" 
      type="email"
      required
      placeholder="john@example.com"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Email />
          </InputAdornment>
        ),
      }}
    />
    <TextField 
      label="Bio" 
      multiline
      rows={4}
      placeholder="Tell us about yourself..."
      helperText="Optional field"
    />
  </div>
);
