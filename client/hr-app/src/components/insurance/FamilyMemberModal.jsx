/**
 * Family Member Modal Component
 * 
 * Modal for adding/editing family members in insurance policies
 */

import { useState, useEffect } from 'react';
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
    Alert
} from '@mui/material';

const FamilyMemberModal = ({ open, onClose, onSave, member, policyId }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        relationship: '',
        dateOfBirth: null,
        gender: '',
        nationalId: '',
        phone: '',
        email: '',
        status: 'active'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (member) {
            setFormData({
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                relationship: member.relationship || '',
                dateOfBirth: member.dateOfBirth || null,
                gender: member.gender || '',
                nationalId: member.nationalId || '',
                phone: member.phone || '',
                email: member.email || '',
                status: member.status || 'active'
            });
        } else {
            setFormData({
                firstName: '',
                lastName: '',
                relationship: '',
                dateOfBirth: null,
                gender: '',
                nationalId: '',
                phone: '',
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        
        // Validation
        if (!formData.firstName.trim()) {
            setError('First name is required');
            return;
        }
        
        if (!formData.lastName.trim()) {
            setError('Last name is required');
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
        { value: 'parent', label: 'Parent' }
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
                                    label="First Name"
                                    value={formData.firstName}
                                    onChange={handleChange('firstName')}
                                    required
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Last Name"
                                    value={formData.lastName}
                                    onChange={handleChange('lastName')}
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
                                <TextField
                                    fullWidth
                                    label="Date of Birth"
                                    type="date"
                                    value={formData.dateOfBirth || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                    required
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        htmlInput: { max: new Date().toISOString().split('T')[0] }
                                    }}
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
                                    value={formData.phone}
                                    onChange={handleChange('phone')}
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