/**
 * Company Email Settings Component
 * 
 * Allows administrators to configure the company email domain
 * for automatic email generation when creating users.
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    TextField,
    Button,
    Typography,
    Alert,
    Stack,
    Chip,
    InputAdornment,
    CircularProgress,
    Divider
} from '@mui/material';
import {
    Email as EmailIcon,
    Save as SaveIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import companyService from '../services/company.service';
import useNotifications from '../hooks/useNotifications/useNotifications';

const CompanyEmailSettings = () => {
    const [emailDomain, setEmailDomain] = useState('');
    const [originalDomain, setOriginalDomain] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [previewUsername, setPreviewUsername] = useState('john.doe');
    
    const { user } = useAuth();
    const notifications = useNotifications();

    // Check if user has admin permissions
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';

    useEffect(() => {
        fetchEmailDomain();
    }, []);

    const fetchEmailDomain = async () => {
        try {
            setLoading(true);
            const response = await companyService.getEmailDomain();
            const domain = response.data.emailDomain;
            setEmailDomain(domain);
            setOriginalDomain(domain);
        } catch (error) {
            console.error('Error fetching email domain:', error);
            if (error.response?.status === 404) {
                setError('Email domain not configured yet');
            } else {
                setError('Failed to load email domain settings');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!emailDomain.trim()) {
            setError('Email domain is required');
            return;
        }

        if (!companyService.validateEmailDomain(emailDomain)) {
            setError('Invalid email domain format');
            return;
        }

        try {
            setSaving(true);
            setError('');
            
            await companyService.updateEmailDomain(emailDomain);
            setOriginalDomain(emailDomain);
            
            notifications.show('Email domain updated successfully', {
                severity: 'success',
                autoHideDuration: 4000,
            });
        } catch (error) {
            console.error('Error updating email domain:', error);
            const errorMessage = error.response?.data?.message || 'Failed to update email domain';
            setError(errorMessage);
            
            notifications.show(`Failed to update email domain: ${errorMessage}`, {
                severity: 'error',
                autoHideDuration: 5000,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setEmailDomain(originalDomain);
        setError('');
    };

    const generatePreviewEmail = () => {
        if (!previewUsername || !emailDomain) return '';
        return companyService.generateEmailPreview(previewUsername, emailDomain);
    };

    const hasChanges = emailDomain !== originalDomain;

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                        <CircularProgress />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                            Loading email settings...
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader
                title="Email Domain Configuration"
                subheader="Configure the email domain for automatic user email generation"
                avatar={<EmailIcon color="primary" />}
            />
            <CardContent>
                <Stack spacing={3}>
                    {/* Email Domain Input */}
                    <TextField
                        label="Company Email Domain"
                        value={emailDomain}
                        onChange={(e) => {
                            setEmailDomain(e.target.value.toLowerCase().trim());
                            setError('');
                        }}
                        placeholder="company.com"
                        fullWidth
                        disabled={!isAdmin}
                        error={!!error}
                        helperText={error || 'Enter your company\'s email domain (e.g., company.com)'}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    @
                                </InputAdornment>
                            ),
                            endAdornment: emailDomain && companyService.validateEmailDomain(emailDomain) && (
                                <InputAdornment position="end">
                                    <CheckCircleIcon color="success" />
                                </InputAdornment>
                            )
                        }}
                    />

                    {/* Preview Section */}
                    {emailDomain && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Email Generation Preview
                            </Typography>
                            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                                    <TextField
                                        label="Username"
                                        value={previewUsername}
                                        onChange={(e) => setPreviewUsername(e.target.value)}
                                        size="small"
                                        sx={{ minWidth: 150 }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        →
                                    </Typography>
                                    <Chip
                                        label={generatePreviewEmail() || 'Invalid input'}
                                        color={generatePreviewEmail() ? 'primary' : 'default'}
                                        variant="outlined"
                                    />
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                    This shows how emails will be generated for new users
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Information Alert */}
                    <Alert severity="info" icon={<InfoIcon />}>
                        <Typography variant="body2">
                            <strong>How it works:</strong>
                        </Typography>
                        <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
                            <li>When creating users, if no email is provided, one will be auto-generated</li>
                            <li>Format: username@your-domain.com</li>
                            <li>If the email already exists, a number will be added (e.g., john.doe1@company.com)</li>
                            <li>Users can still provide their own email addresses if needed</li>
                        </Typography>
                    </Alert>

                    {/* Permission Warning */}
                    {!isAdmin && (
                        <Alert severity="warning" icon={<WarningIcon />}>
                            You need administrator privileges to modify email domain settings.
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    {isAdmin && (
                        <>
                            <Divider />
                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                <Button
                                    variant="outlined"
                                    onClick={handleReset}
                                    disabled={!hasChanges || saving}
                                >
                                    Reset
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                                    onClick={handleSave}
                                    disabled={!hasChanges || saving || !emailDomain.trim()}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </Stack>
                        </>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default CompanyEmailSettings;