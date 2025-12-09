import React, { useState } from 'react';
import Select from './Select';
import { MenuItem } from '@mui/material';

export default {
  title: 'Base Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Default select
export const Default = () => {
  const [value, setValue] = useState('');

  return (
    <div style={{ width: '300px' }}>
      <Select
        label="Select Option"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
        <MenuItem value="option3">Option 3</MenuItem>
      </Select>
    </div>
  );
};

// With helper text
export const WithHelperText = () => {
  const [value, setValue] = useState('');

  return (
    <div style={{ width: '300px' }}>
      <Select
        label="Country"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        helperText="Select your country"
      >
        <MenuItem value="us">United States</MenuItem>
        <MenuItem value="uk">United Kingdom</MenuItem>
        <MenuItem value="ca">Canada</MenuItem>
        <MenuItem value="au">Australia</MenuItem>
      </Select>
    </div>
  );
};

// Error state
export const ErrorState = () => {
  const [value, setValue] = useState('');

  return (
    <div style={{ width: '300px' }}>
      <Select
        label="Required Field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error
        helperText="This field is required"
        required
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
      </Select>
    </div>
  );
};

// Disabled state
export const Disabled = () => {
  return (
    <div style={{ width: '300px' }}>
      <Select
        label="Disabled Select"
        value="option1"
        disabled
        helperText="This field is disabled"
      >
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
      </Select>
    </div>
  );
};

// Different sizes
export const Sizes = () => {
  const [small, setSmall] = useState('option1');
  const [medium, setMedium] = useState('option1');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
      <Select
        label="Small Size"
        value={small}
        onChange={(e) => setSmall(e.target.value)}
        size="small"
      >
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
        <MenuItem value="option3">Option 3</MenuItem>
      </Select>
      
      <Select
        label="Medium Size"
        value={medium}
        onChange={(e) => setMedium(e.target.value)}
        size="medium"
      >
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
        <MenuItem value="option3">Option 3</MenuItem>
      </Select>
    </div>
  );
};

// Full width
export const FullWidth = () => {
  const [value, setValue] = useState('');

  return (
    <div style={{ width: '600px' }}>
      <Select
        label="Full Width Select"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        fullWidth
        helperText="This select spans the full width"
      >
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
        <MenuItem value="option3">Option 3</MenuItem>
      </Select>
    </div>
  );
};

// Multiple options
export const ManyOptions = () => {
  const [value, setValue] = useState('');

  return (
    <div style={{ width: '300px' }}>
      <Select
        label="Department"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        helperText="Select your department"
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        <MenuItem value="engineering">Engineering</MenuItem>
        <MenuItem value="design">Design</MenuItem>
        <MenuItem value="product">Product</MenuItem>
        <MenuItem value="marketing">Marketing</MenuItem>
        <MenuItem value="sales">Sales</MenuItem>
        <MenuItem value="hr">Human Resources</MenuItem>
        <MenuItem value="finance">Finance</MenuItem>
        <MenuItem value="operations">Operations</MenuItem>
      </Select>
    </div>
  );
};

// Form example
export const FormExample = () => {
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '400px' }}>
      <Select
        label="Country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        required
        helperText="Required field"
      >
        <MenuItem value="us">United States</MenuItem>
        <MenuItem value="uk">United Kingdom</MenuItem>
        <MenuItem value="ca">Canada</MenuItem>
      </Select>
      
      <Select
        label="State/Province"
        value={state}
        onChange={(e) => setState(e.target.value)}
        disabled={!country}
        helperText={!country ? "Select a country first" : ""}
      >
        <MenuItem value="ca">California</MenuItem>
        <MenuItem value="ny">New York</MenuItem>
        <MenuItem value="tx">Texas</MenuItem>
      </Select>
      
      <Select
        label="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        disabled={!state}
        helperText={!state ? "Select a state first" : ""}
      >
        <MenuItem value="sf">San Francisco</MenuItem>
        <MenuItem value="la">Los Angeles</MenuItem>
        <MenuItem value="sd">San Diego</MenuItem>
      </Select>
    </div>
  );
};
