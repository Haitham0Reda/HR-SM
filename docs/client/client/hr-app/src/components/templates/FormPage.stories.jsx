import React from 'react';
import FormPage from './FormPage';
import TextField from '../common/TextField';
import Select from '../common/Select';
import Checkbox from '../common/Checkbox';
import { MenuItem, Stack } from '@mui/material';

export default {
  title: 'Page Templates/FormPage',
  component: FormPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

// Basic form page
export const Basic = () => (
  <FormPage
    title="Create User"
    subtitle="Add a new user to the system"
    sections={[
      {
        title: 'Personal Information',
        description: 'Enter the user\'s personal details',
        content: (
          <Stack spacing={2}>
            <TextField label="First Name" required fullWidth />
            <TextField label="Last Name" required fullWidth />
            <TextField label="Email" type="email" required fullWidth />
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => {
      e.preventDefault();
      alert('Form submitted!');
    }}
    onCancel={() => alert('Form cancelled')}
  />
);

// With breadcrumbs
export const WithBreadcrumbs = () => (
  <FormPage
    title="Create User"
    subtitle="Add a new user to the system"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'Users', path: '/users' },
      { label: 'Create' },
    ]}
    sections={[
      {
        title: 'Personal Information',
        content: (
          <Stack spacing={2}>
            <TextField label="First Name" required fullWidth />
            <TextField label="Last Name" required fullWidth />
            <TextField label="Email" type="email" required fullWidth />
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => {
      e.preventDefault();
      alert('Form submitted!');
    }}
  />
);

// Multiple sections
export const MultipleSections = () => (
  <FormPage
    title="Create Employee"
    subtitle="Add a new employee to the organization"
    sections={[
      {
        title: 'Personal Information',
        description: 'Basic personal details',
        content: (
          <Stack spacing={2}>
            <TextField label="First Name" required fullWidth />
            <TextField label="Last Name" required fullWidth />
            <TextField label="Email" type="email" required fullWidth />
            <TextField label="Phone" fullWidth />
          </Stack>
        ),
      },
      {
        title: 'Employment Details',
        description: 'Job-related information',
        content: (
          <Stack spacing={2}>
            <TextField label="Employee ID" required fullWidth />
            <Select label="Department" required fullWidth>
              <MenuItem value="engineering">Engineering</MenuItem>
              <MenuItem value="hr">Human Resources</MenuItem>
              <MenuItem value="sales">Sales</MenuItem>
            </Select>
            <Select label="Position" required fullWidth>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="senior">Senior</MenuItem>
              <MenuItem value="junior">Junior</MenuItem>
            </Select>
            <TextField label="Start Date" type="date" required fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
        ),
      },
      {
        title: 'Additional Information',
        description: 'Optional details',
        content: (
          <Stack spacing={2}>
            <TextField label="Notes" multiline rows={4} fullWidth />
            <Checkbox label="Send welcome email" />
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => {
      e.preventDefault();
      alert('Form submitted!');
    }}
  />
);

// Loading state
export const Loading = () => (
  <FormPage
    title="Create User"
    subtitle="Saving user..."
    sections={[
      {
        title: 'Personal Information',
        content: (
          <Stack spacing={2}>
            <TextField label="First Name" required fullWidth />
            <TextField label="Last Name" required fullWidth />
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => e.preventDefault()}
    loading={true}
  />
);

// With error
export const WithError = () => (
  <FormPage
    title="Create User"
    subtitle="Fix the errors below"
    sections={[
      {
        title: 'Personal Information',
        content: (
          <Stack spacing={2}>
            <TextField label="First Name" required fullWidth error helperText="First name is required" />
            <TextField label="Email" type="email" required fullWidth error helperText="Invalid email address" />
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => e.preventDefault()}
    error="Please fix the errors in the form before submitting."
  />
);

// With success
export const WithSuccess = () => (
  <FormPage
    title="Create User"
    subtitle="User created successfully"
    sections={[
      {
        title: 'Personal Information',
        content: (
          <Stack spacing={2}>
            <TextField label="First Name" required fullWidth defaultValue="John" />
            <TextField label="Last Name" required fullWidth defaultValue="Doe" />
            <TextField label="Email" type="email" required fullWidth defaultValue="john@example.com" />
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => e.preventDefault()}
    success="User created successfully!"
  />
);

// Edit form
export const EditForm = () => (
  <FormPage
    title="Edit User"
    subtitle="Update user information"
    breadcrumbs={[
      { label: 'Home', path: '/' },
      { label: 'Users', path: '/users' },
      { label: 'Edit' },
    ]}
    sections={[
      {
        title: 'Personal Information',
        content: (
          <Stack spacing={2}>
            <TextField label="First Name" required fullWidth defaultValue="John" />
            <TextField label="Last Name" required fullWidth defaultValue="Doe" />
            <TextField label="Email" type="email" required fullWidth defaultValue="john@example.com" />
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => {
      e.preventDefault();
      alert('User updated!');
    }}
    submitLabel="Update"
  />
);

// Complete example
export const CompleteExample = () => (
  <FormPage
    title="Create Employee"
    subtitle="Add a new employee to the organization"
    breadcrumbs={[
      { label: 'Dashboard', path: '/' },
      { label: 'Employees', path: '/employees' },
      { label: 'Create' },
    ]}
    sections={[
      {
        title: 'Personal Information',
        description: 'Enter the employee\'s personal details',
        content: (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="First Name" required fullWidth />
              <TextField label="Last Name" required fullWidth />
            </Stack>
            <TextField label="Email" type="email" required fullWidth />
            <TextField label="Phone Number" fullWidth />
            <TextField label="Date of Birth" type="date" fullWidth InputLabelProps={{ shrink: true }} />
          </Stack>
        ),
      },
      {
        title: 'Employment Details',
        description: 'Specify employment-related information',
        content: (
          <Stack spacing={2}>
            <TextField label="Employee ID" required fullWidth />
            <Stack direction="row" spacing={2}>
              <Select label="Department" required fullWidth>
                <MenuItem value="engineering">Engineering</MenuItem>
                <MenuItem value="hr">Human Resources</MenuItem>
                <MenuItem value="sales">Sales</MenuItem>
                <MenuItem value="marketing">Marketing</MenuItem>
              </Select>
              <Select label="Position" required fullWidth>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="senior">Senior</MenuItem>
                <MenuItem value="junior">Junior</MenuItem>
                <MenuItem value="intern">Intern</MenuItem>
              </Select>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Start Date" type="date" required fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Salary" type="number" fullWidth />
            </Stack>
          </Stack>
        ),
      },
      {
        title: 'Additional Information',
        description: 'Optional additional details',
        content: (
          <Stack spacing={2}>
            <TextField
              label="Notes"
              multiline
              rows={4}
              fullWidth
              placeholder="Enter any additional notes about the employee..."
            />
            <Stack spacing={1}>
              <Checkbox label="Send welcome email to employee" />
              <Checkbox label="Add to company directory" />
              <Checkbox label="Assign default permissions" />
            </Stack>
          </Stack>
        ),
      },
    ]}
    onSubmit={(e) => {
      e.preventDefault();
      alert('Employee created successfully!');
    }}
    onCancel={() => alert('Form cancelled')}
    showUnsavedWarning={true}
  />
);
