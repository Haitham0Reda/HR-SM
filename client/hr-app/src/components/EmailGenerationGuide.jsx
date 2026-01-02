/**
 * Email Generation Guide Component
 * 
 * Provides comprehensive documentation and examples for the automatic
 * email generation feature.
 */

import React from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Stack,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    Help as HelpIcon,
    ExpandMore as ExpandMoreIcon,
    AutoAwesome as AutoAwesomeIcon,
    Email as EmailIcon,
    Security as SecurityIcon,
    Speed as SpeedIcon
} from '@mui/icons-material';

const EmailGenerationGuide = () => {
    const examples = [
        { input: 'John Doe', existing: [], generated: 'john.doe@company.com' },
        { input: 'John Doe', existing: ['john.doe@company.com'], generated: 'john.doe1@company.com' },
        { input: 'Jane Smith', existing: ['jane.smith@company.com', 'jane.smith1@company.com'], generated: 'jane.smith2@company.com' },
        { input: 'María García', existing: [], generated: 'maria.garcia@company.com' },
        { input: 'Jean-Pierre Dubois', existing: [], generated: 'jean-pierre.dubois@company.com' },
        { input: 'Ahmed Al-Rashid', existing: [], generated: 'ahmed.al-rashid@company.com' }
    ];

    const features = [
        {
            icon: <AutoAwesomeIcon color="primary" />,
            title: 'Automatic Generation',
            description: 'Emails are automatically created from usernames when not provided'
        },
        {
            icon: <SecurityIcon color="success" />,
            title: 'Uniqueness Guaranteed',
            description: 'System ensures all generated emails are unique within the organization'
        },
        {
            icon: <SpeedIcon color="warning" />,
            title: 'Fast & Efficient',
            description: 'Speeds up user creation process by eliminating manual email entry'
        },
        {
            icon: <EmailIcon color="info" />,
            title: 'Professional Format',
            description: 'Generates professional email addresses using company domain'
        }
    ];

    return (
        <Card>
            <CardHeader
                title="Email Generation Guide"
                subheader="Learn how automatic email generation works"
                avatar={<HelpIcon color="primary" />}
            />
            <CardContent>
                <Stack spacing={3}>
                    {/* Overview */}
                    <Alert severity="info" icon={<AutoAwesomeIcon />}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            How It Works
                        </Typography>
                        <Typography variant="body2">
                            When creating users, if no email is provided, the system automatically generates 
                            one using the format: <code>firstname.lastname@company-domain.com</code>
                        </Typography>
                    </Alert>

                    {/* Features */}
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Key Features
                        </Typography>
                        <Stack spacing={2}>
                            {features.map((feature, index) => (
                                <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    {feature.icon}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {feature.description}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    </Box>

                    {/* Examples Table */}
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Generation Examples
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>User Name</strong></TableCell>
                                        <TableCell><strong>Existing Emails</strong></TableCell>
                                        <TableCell><strong>Generated Email</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {examples.map((example, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <code>{example.input}</code>
                                            </TableCell>
                                            <TableCell>
                                                {example.existing.length > 0 ? (
                                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                        {example.existing.map((email, i) => (
                                                            <Chip
                                                                key={i}
                                                                label={email}
                                                                size="small"
                                                                variant="outlined"
                                                                color="warning"
                                                            />
                                                        ))}
                                                    </Stack>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        None
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={example.generated}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>

                    {/* Detailed Rules */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Detailed Generation Rules
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                        Name-to-Email Conversion:
                                    </Typography>
                                    <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                                        <li><strong>Primary method:</strong> Uses first name + last name (e.g., "John Doe" → john.doe@domain.com)</li>
                                        <li><strong>Fallback method:</strong> Uses username if name is not available</li>
                                        <li>Converts to lowercase</li>
                                        <li>Replaces spaces with dots</li>
                                        <li>Removes invalid characters (keeps only letters, numbers, dots, underscores, hyphens)</li>
                                        <li>Removes leading/trailing dots, underscores, hyphens</li>
                                        <li>Limits to 64 characters (email local part maximum)</li>
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                                        Uniqueness Algorithm:
                                    </Typography>
                                    <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                                        <li>Generate base email: <code>firstname.lastname@domain</code></li>
                                        <li>Check if email exists in the company</li>
                                        <li>If exists, try <code>firstname.lastname1@domain</code>, <code>firstname.lastname2@domain</code>, etc.</li>
                                        <li>Stop at first available email (maximum 999 attempts)</li>
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" color="warning.main" gutterBottom>
                                        Domain Requirements:
                                    </Typography>
                                    <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                                        <li>Must be a valid DNS domain format</li>
                                        <li>Can have multiple levels (e.g., mail.company.com)</li>
                                        <li>Cannot start or end with dots or hyphens</li>
                                        <li>Must be configured by administrator</li>
                                    </Typography>
                                </Box>
                            </Stack>
                        </AccordionDetails>
                    </Accordion>

                    {/* Usage Tips */}
                    <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                Usage Tips & Best Practices
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Stack spacing={2}>
                                <Alert severity="success">
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        ✅ Best Practices:
                                    </Typography>
                                    <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                                        <li>Ensure first and last names are provided for all users</li>
                                        <li>Use consistent name formats (proper capitalization)</li>
                                        <li>Configure a clear, professional company domain</li>
                                        <li>Review generated emails before finalizing user creation</li>
                                        <li>Keep names simple and readable when possible</li>
                                    </Typography>
                                </Alert>

                                <Alert severity="warning">
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        ⚠️ Things to Avoid:
                                    </Typography>
                                    <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                                        <li>Using special characters in usernames</li>
                                        <li>Very long usernames (over 50 characters)</li>
                                        <li>Changing company domain frequently</li>
                                        <li>Duplicate usernames across departments</li>
                                    </Typography>
                                </Alert>

                                <Alert severity="info">
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                        💡 Pro Tips:
                                    </Typography>
                                    <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                                        <li>Users can still provide custom email addresses if needed</li>
                                        <li>Bulk import works with email auto-generation</li>
                                        <li>Generated emails are immediately available for login</li>
                                        <li>Email generation works for all user roles</li>
                                    </Typography>
                                </Alert>
                            </Stack>
                        </AccordionDetails>
                    </Accordion>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default EmailGenerationGuide;