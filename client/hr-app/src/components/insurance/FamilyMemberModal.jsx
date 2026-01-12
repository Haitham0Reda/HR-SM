/**
 * Family Member Modal Component
 * 
 * Modal for adding/editing family members in insurance policies
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Box
} from '@mui/material';
import DatePicker from '../common/DatePicker';

const FamilyMemberModal = ({ open, onClose, onSave, member, policyId }) => {
    const [formData, setFormData] = useState({
        name: '',
        relationship: '',
        dateOfBirth: null,
        gender: '',
        nationalId: '',
        phoneNumber: '',
        email: '',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || '',
                relationship: member.relationship || '',
                dateOfBirth: member.dateOfBirth || null,
                gender: member.gender || '',
                nationalId: member.nationalId || '',
                phoneNumber: member.phoneNumber || '',
                email: member.email || '',
                status: member.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                relationship: '',
                dateOfBirth: null,
                gender: '',
                nationalId: '',
                phoneNumber: '',
                email: '',
                status: 'active'
            });
        }
        setError(null);
    }, [member, open]);

    const handleChange = (field) => (event) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            dateOfBirth: date
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }
        
        if (!formData.relationship) {
            setError('Relationship is required');
            return;
        }
        
        if (!formData.dateOfBirth) {
            setError('Date of birth is required');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            await onSave(formData);
        } catch (err) {
            setError(err.message || 'Failed to save family member');
        } finally {
            setLoading(false);
        }
    };

    const relationshipOptions = [
        { value: 'spouse', label: 'Spouse' },
        { value: 'child', label: 'Child' },
        { value: 'parent', label: 'Parent' },
        { value: 'sibling', label: 'Sibling' },
        { value: 'other', label: 'Other' }
    ];

    const genderOptions = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
    ];

    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
    ];

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
                <form onSubmit={handleSubmit}>
                    <DialogTitle>
                        {member ? 'Edit Family Member' : 'Add Family Member'}
                    </DialogTitle>
                    
                    <DialogContent>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Full Name"
                                    value={formData.name}
                                    onChange={handleChange('name')}
                                    required
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Relationship</InputLabel>
                                    <Select
                                        value={formData.relationship}
                                        onChange={handleChange('relationship')}
                                        label="Relationship"
                                    >
                                        {relationshipOptions.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <DatePicker
                                    label="Date of Birth"
                                    value={formData.dateOfBirth}
                                    onChange={handleDateChange}
                                    fullWidth
                                    required
                                    maxDate={new Date()}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Gender</InputLabel>
                                    <Select
                                        value={formData.gender}
                                        onChange={handleChange('gender')}
                                        label="Gender"
                                    >
                                        {genderOptions.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="National ID"
                                    value={formData.nationalId}
                                    onChange={handleChange('nationalId')}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    value={formData.phoneNumber}
                                    onChange={handleChange('phoneNumber')}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange('email')}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        onChange={handleChange('status')}
                                        label="Status"
                                    >
                                        {statusOptions.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    
                    <DialogActions>
                        <Button onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            variant="contained" 
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (member ? 'Update' : 'Add')}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
    );
};

export default FamilyMemberModal;