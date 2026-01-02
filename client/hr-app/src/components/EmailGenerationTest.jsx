/**
 * Email Generation Test Component
 * 
 * A simple component to test and demonstrate the email generation functionality.
 * This can be used for development and testing purposes.
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    TextField,
    Typography,
    Stack,
    Chip,
    Alert,
    Button,
    Divider,
    Grid
} from '@mui/material';
import {
    Email as EmailIcon,
    PlayArrow as PlayArrowIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import companyService from '../services/company.service';

const EmailGenerationTest = () => {
    const [firstName, setFirstName] = useState('John');
    const [lastName, setLastName] = useState('Doe');
    const [username, setUsername] = useState('john.doe');
    const [emailDomain, setEmailDomain] = useState('');
    const [generatedEmail, setGeneratedEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchEmailDomain();
    }, []);

    useEffect(() => {
        if (emailDomain) {
            const userData = { firstName, lastName, username };
            const preview = companyService.generateEmailPreview(userData, emailDomain);
            setGeneratedEmail(preview);
        } else {
            setGeneratedEmail('');
        }
    }, [firstName, lastName, username, emailDomain]);

    const fetchEmailDomain = async () => {
        try {
            setLoading(true);
            const response = await companyService.getEmailDomain();
            setEmailDomain(response.data.emailDomain);
            setError('');
        } catch (error) {
            console.error('Error fetching email domain:', error);
            setError('Email domain not configured');
        } finally {
            setLoading(false);
        }
    };

    const testUsers = [
        { firstName: 'John', lastName: 'Doe', username: 'john.doe' },
        { firstName: 'Jane', lastName: 'Smith', username: 'jane.smith' },
        { firstName: 'Mike', lastName: 'Johnson', username: 'mike.johnson' },
        { firstName: 'Sarah', lastName: 'Wilson', username: 'sarah.wilson' },
        { firstName: 'Ahmed', lastName: 'Al-Rashid', username: 'ahmed.alrashid' },
        { firstName: 'María', lastName: 'García', username: 'maria.garcia' },
        { firstName: 'Jean-Pierre', lastName: 'Dubois', username: 'jean.pierre' },
        { firstName: 'Very Long First Name', lastName: 'Very Long Last Name', username: 'very.long.name' }
    ];

    const handleTestUser = (testUser) => {
        setFirstName(testUser.firstName);
        setLastName(testUser.lastName);
        setUsername(testUser.username);
    };

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography>Loading email domain...</Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader
                title="Email Generation Test"
                subheader="Test the automatic email generation functionality"
                avatar={<EmailIcon color="primary" />}
                action={
                    <Button
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={fetchEmailDomain}
                    >
                        Refresh Domain
                    </Button>
                }
            />
            <CardContent>
                <Stack spacing={3}>
                    {error && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {emailDomain && (
                        <Alert severity="info">
                            Company email domain: <strong>{emailDomain}</strong>
                        </Alert>
                    )}

                    {/* Name and Username Inputs */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Enter first name"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Enter last name"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Username (fallback)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                fullWidth
                                helperText="Used if name is not available"
                            />
                        </Grid>
                    </Grid>

                    {/* Generated Email Display */}
                    {generatedEmail && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Generated Email:
                            </Typography>
                            <Chip
                                label={generatedEmail}
                                color="primary"
                                variant="outlined"
                                size="large"
                                sx={{ fontSize: '1rem', p: 1 }}
                            />
                        </Box>
                    )}

                    <Divider />

                    {/* Test Users */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Test with sample users:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {testUsers.map((testUser, index) => (
                                <Button
                                    key={index}
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => handleTestUser(testUser)}
                                    sx={{ mb: 1 }}
                                >
                                    {testUser.firstName} {testUser.lastName}
                                </Button>
                            ))}
                        </Stack>
                    </Box>

                    {/* Email Generation Rules */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Email Generation Rules:
                        </Typography>
                        <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                            <li><strong>Primary method:</strong> Generates from first name + last name (e.g., "John Doe" → john.doe@{emailDomain || 'company.com'})</li>
                            <li><strong>Fallback method:</strong> Uses username if name is not available</li>
                            <li>Converts to lowercase and replaces spaces with dots</li>
                            <li>Removes invalid characters (keeps letters, numbers, dots, underscores, hyphens)</li>
                            <li>Removes leading/trailing special characters</li>
                            <li>Limits to 64 characters (email local part limit)</li>
                            <li>If email exists, adds numbers: firstname.lastname1@domain, firstname.lastname2@domain, etc.</li>
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default EmailGenerationTest;