import React from 'react';
import FormSection from './FormSection';
import TextField from '../common/TextField';
import Select from '../common/Select';
import Checkbox from '../common/Checkbox';
import { MenuItem } from '@mui/material';

export default {
  title: 'Composite Components/FormSection',
  component: FormSection,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

// Basic form section
export const Basic = () => (
  <div style={{ maxWidth: '600px' }}>
    <FormSection
      title="Personal Information"
      description="Enter your personal details below."
    >
      <TextField label="First Name" required fullWidth />
      <TextField label="Last Name" required fullWidth />
      <TextField label="Email" type="email" required fullWidth />
    </FormSection>
  </div>
);

// Without description
export const WithoutDescription = () => (
  <div style={{ maxWidth: '600px' }}>
    <FormSection title="Contact Information">
      <TextField label="Phone Number" fullWidth />
      <TextField label="Address" fullWidth />
      <TextField label="City" fullWidth />
    </FormSection>
  </div>
);

// Without divider
export const WithoutDivider = () => (
  <div style={{ maxWidth: '600px' }}>
    <FormSection
      title="Account Settings"
      description="Configure your account preferences."
      divider={false}
    >
      <TextField label="Username" required fullWidth />
      <TextField label="Password" type="password" required fullWidth />
    </FormSection>
  </div>
);

// Multiple sections
export const MultipleSections = () => (
  <div style={{ maxWidth: '600px' }}>
    <FormSection
      title="Personal Information"
      description="Enter your personal details."
    >
      <TextField label="First Name" required fullWidth />
      <TextField label="Last Name" required fullWidth />
      <TextField label="Email" type="email" required fullWidth />
      <TextField label="Phone" fullWidth />
    </FormSection>

    <FormSection
      title="Address"
      description="Enter your mailing address."
    >
      <TextField label="Street Address" fullWidth />
      <TextField label="City" fullWidth />
      <Select label="State" fullWidth>
        <MenuItem value="ca">California</MenuItem>
        <MenuItem value="ny">New York</MenuItem>
        <MenuItem value="tx">Texas</MenuItem>
      </Select>
      <TextField label="ZIP Code" fullWidth />
    </FormSection>

    <FormSection
      title="Preferences"
      description="Configure your preferences."
      divider={false}
    >
      <Checkbox label="Receive email notifications" />
      <Checkbox label="Receive SMS notifications" />
      <Checkbox label="Subscribe to newsletter" />
    </FormSection>
  </div>
);

// Employee form example
export const EmployeeForm = () => (
  <div style={{ maxWidth: '700px' }}>
    <FormSection
      title="Basic Information"
      description="Enter the employee's basic information."
    >
      <TextField label="Employee ID" required fullWidth />
      <TextField label="First Name" required fullWidth />
      <TextField label="Last Name" required fullWidth />
      <TextField label="Email" type="email" required fullWidth />
      <TextField label="Phone Number" fullWidth />
    </FormSection>

    <FormSection
      title="Employment Details"
      description="Specify employment-related information."
    >
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
      </Select>
      <TextField label="Start Date" type="date" required fullWidth InputLabelProps={{ shrink: true }} />
      <TextField label="Salary" type="number" fullWidth />
    </FormSection>

    <FormSection
      title="Additional Information"
      description="Optional additional details."
      divider={false}
    >
      <TextField
        label="Notes"
        multiline
        rows={4}
        fullWidth
        placeholder="Enter any additional notes..."
      />
    </FormSection>
  </div>
);

// Settings form example
export const SettingsForm = () => (
  <div style={{ maxWidth: '700px' }}>
    <FormSection
      title="Account Settings"
      description="Manage your account preferences."
    >
      <TextField label="Display Name" fullWidth />
      <TextField label="Email" type="email" fullWidth />
      <TextField label="Current Password" type="password" fullWidth />
      <TextField label="New Password" type="password" fullWidth />
    </FormSection>

    <FormSection
      title="Notification Preferences"
      description="Choose how you want to be notified."
    >
      <Checkbox label="Email notifications for new messages" />
      <Checkbox label="Email notifications for updates" />
      <Checkbox label="Push notifications on mobile" />
      <Checkbox label="Weekly summary email" />
    </FormSection>

    <FormSection
      title="Privacy Settings"
      description="Control your privacy and data sharing."
    >
      <Checkbox label="Make profile public" />
      <Checkbox label="Show email address" />
      <Checkbox label="Allow search engines to index profile" />
    </FormSection>

    <FormSection
      title="Danger Zone"
      description="Irreversible actions that affect your account."
      divider={false}
    >
      <Checkbox label="I understand that deleting my account is permanent" />
    </FormSection>
  </div>
);

// Compact form
export const CompactForm = () => (
  <div style={{ maxWidth: '500px' }}>
    <FormSection title="Quick Add">
      <TextField label="Name" required fullWidth size="small" />
      <TextField label="Email" type="email" required fullWidth size="small" />
      <Select label="Role" required fullWidth size="small">
        <MenuItem value="admin">Admin</MenuItem>
        <MenuItem value="user">User</MenuItem>
      </Select>
    </FormSection>
  </div>
);

// Long description
export const LongDescription = () => (
  <div style={{ maxWidth: '700px' }}>
    <FormSection
      title="Data Collection"
      description="We collect this information to provide you with better service and personalized experience. Your data is protected according to our privacy policy and will never be shared with third parties without your explicit consent. You can update or delete this information at any time from your account settings."
    >
      <TextField label="Full Name" required fullWidth />
      <TextField label="Date of Birth" type="date" fullWidth InputLabelProps={{ shrink: true }} />
      <TextField label="Occupation" fullWidth />
    </FormSection>
  </div>
);
