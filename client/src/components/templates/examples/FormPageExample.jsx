/**
 * FormPage Template Example
 * 
 * Demonstrates how to use the FormPage template for creating create/edit pages.
 */

import React, { useState } from 'react';
import FormPage from '../FormPage';
import {
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Switch,
  FormControlLabel,
  Chip,
  Box,
  Stack,
} from '@mui/material';

const FormPageExample = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    startDate: '',
    isActive: true,
    skills: [],
    bio: '',
  });

  const [errors, setErrors] = useState({});

  // Handle input change
  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Form submitted:', formData);
      setSuccess('User created successfully!');
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: '',
          department: '',
          startDate: '',
          isActive: true,
          skills: [],
          bio: '',
        });
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    console.log('Form cancelled');
    // Navigate back or reset form
  };

  // Define breadcrumbs
  const breadcrumbs = [
    { label: 'Dashboard', path: '/app/dashboard' },
    { label: 'Users', path: '/app/users' },
    { label: 'Create User' },
  ];

  // Define form sections
  const sections = [
    {
      title: 'Personal Information',
      description: 'Basic information about the user',
      content: (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={handleChange('phone')}
              error={!!errors.phone}
              helperText={errors.phone}
            />
          </Grid>
        </Grid>
      ),
    },
    {
      title: 'Work Information',
      description: 'Employment details and role assignment',
      content: (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.role} required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={handleChange('role')}
                label="Role"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
              </Select>
              {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.department} required>
              <InputLabel>Department</InputLabel>
              <Select
                value={formData.department}
                onChange={handleChange('department')}
                label="Department"
              >
                <MenuItem value="engineering">Engineering</MenuItem>
                <MenuItem value="sales">Sales</MenuItem>
                <MenuItem value="marketing">Marketing</MenuItem>
                <MenuItem value="hr">Human Resources</MenuItem>
              </Select>
              {errors.department && <FormHelperText>{errors.department}</FormHelperText>}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={handleChange('startDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleChange('isActive')}
                />
              }
              label="Active Status"
            />
          </Grid>
        </Grid>
      ),
    },
    {
      title: 'Additional Information',
      description: 'Optional details about the user',
      content: (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Bio"
              multiline
              rows={4}
              value={formData.bio}
              onChange={handleChange('bio')}
              helperText="Brief description about the user"
            />
          </Grid>
          <Grid item xs={12}>
            <Box>
              <InputLabel sx={{ marginBottom: 1 }}>Skills</InputLabel>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {['React', 'Node.js', 'TypeScript', 'Python', 'AWS'].map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    onClick={() => {
                      const skills = formData.skills.includes(skill)
                        ? formData.skills.filter(s => s !== skill)
                        : [...formData.skills, skill];
                      setFormData(prev => ({ ...prev, skills }));
                    }}
                    color={formData.skills.includes(skill) ? 'primary' : 'default'}
                    sx={{ marginBottom: 1 }}
                  />
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      ),
    },
  ];

  return (
    <FormPage
      title="Create User"
      subtitle="Add a new user to the system"
      breadcrumbs={breadcrumbs}
      sections={sections}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      loading={loading}
      error={error}
      success={success}
      submitLabel="Create User"
      cancelLabel="Cancel"
      showUnsavedWarning={true}
    />
  );
};

export default FormPageExample;
