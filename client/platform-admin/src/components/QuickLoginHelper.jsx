import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Collapse,
    IconButton,
    Stack,
    Chip,
    Divider,
    Paper,
    Grid,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon,
    SupervisorAccount as ManagerIcon,
    Work as EmployeeIcon,
    Business as BusinessIcon,
    Speed as QuickIcon,
} from '@mui/icons-material';

const QuickLoginHelper = ({ onCredentialSelect, type = 'hr' }) => {
    const [expanded, setExpanded] = useState(false);

    // User credentials based on type - ACTUAL DATABASE USERS
    const credentials = {
        hr: [
            {
                label: 'Admin',
                email: 'admin@company.com',
                password: 'admin123',
                role: 'System Administrator',
                realName: 'System Administrator',
                employeeId: 'EMID-0001',
                icon: <AdminIcon />,
                color: '#dc3545'
            },
            {
                label: 'HR Manager',
                email: 'hr@company.com',
                password: 'hr123',
                role: 'HR Manager',
                realName: 'Sarah Ahmed',
                employeeId: 'EMID-0002',
                icon: <PersonIcon />,
                color: '#28a745'
            },
            {
                label: 'Manager',
                email: 'manager@company.com',
                password: 'manager123',
                role: 'Department Manager',
                realName: 'Mohamed Hassan',
                employeeId: 'EMID-0003',
                icon: <ManagerIcon />,
                color: '#007bff'
            },
            {
                label: 'Employee',
                email: 'john.doe@company.com',
                password: 'employee123',
                role: 'Employee',
                realName: 'John Michael Doe',
                employeeId: 'EMID-0004',
                icon: <EmployeeIcon />,
                color: '#6f42c1'
            },
            {
                label: 'Employee 2',
                email: 'jane.smith@company.com',
                password: 'employee123',
                role: 'Employee',
                realName: 'Jane Smith',
                employeeId: 'EMID-0005',
                icon: <EmployeeIcon />,
                color: '#e83e8c'
            },
            {
                label: 'Employee 3',
                email: 'ahmed.ali@company.com',
                password: 'employee123',
                role: 'Employee',
                realName: 'Ahmed Ali',
                employeeId: 'EMID-0006',
                icon: <EmployeeIcon />,
                color: '#20c997'
            },
            {
                label: 'Employee 4',
                email: 'fatma.mohamed@company.com',
                password: 'employee123',
                role: 'Employee',
                realName: 'Fatma Mohamed',
                employeeId: 'EMID-0007',
                icon: <EmployeeIcon />,
                color: '#fd7e14'
            },
            {
                label: 'Employee 5',
                email: 'omar.ibrahim@company.com',
                password: 'employee123',
                role: 'Employee',
                realName: 'Omar Ibrahim',
                employeeId: 'EMID-0008',
                icon: <EmployeeIcon />,
                color: '#6610f2'
            }
        ],
        platform: [
            {
                label: 'Platform Admin',
                email: 'admin@platform.local',
                password: 'Admin@123456',
                role: 'Platform Administrator',
                realName: 'Platform Administrator',
                platformRole: 'super-admin',
                icon: <AdminIcon />,
                color: '#dc3545'
            }
        ]
    };

    const userList = credentials[type] || credentials.hr;

    const handleCredentialClick = (credential) => {
        if (onCredentialSelect) {
            onCredentialSelect(credential.email, credential.password);
        }
    };

    return (
        <Paper
            elevation={2}
            sx={{
                mb: 3,
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#f8f9fa',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    backgroundColor: '#ffffff',
                    borderBottom: expanded ? '1px solid #e0e0e0' : 'none',
                    cursor: 'pointer',
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QuickIcon sx={{ color: '#007bff', fontSize: 20 }} />
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 600,
                            color: '#495057',
                            fontSize: '0.875rem',
                        }}
                    >
                        Quick Login (Development)
                    </Typography>
                    <Chip
                        label="DEV"
                        size="small"
                        sx={{
                            backgroundColor: '#fff3cd',
                            color: '#856404',
                            fontSize: '0.7rem',
                            height: 20,
                            fontWeight: 600,
                        }}
                    />
                </Box>
                <IconButton size="small" sx={{ color: '#007bff' }}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </Box>

            <Collapse in={expanded}>
                <Box sx={{ p: 2 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: '#6c757d',
                            display: 'block',
                            mb: 2,
                            fontSize: '0.75rem',
                        }}
                    >
                        Click any button below to auto-fill login credentials for testing
                    </Typography>

                    <Grid container spacing={1}>
                        {userList.map((credential, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    startIcon={credential.icon}
                                    onClick={() => handleCredentialClick(credential)}
                                    sx={{
                                        textTransform: 'none',
                                        borderColor: credential.color,
                                        color: credential.color,
                                        backgroundColor: 'white',
                                        py: 1,
                                        px: 2,
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        justifyContent: 'flex-start',
                                        '&:hover': {
                                            backgroundColor: credential.color,
                                            color: 'white',
                                            borderColor: credential.color,
                                        },
                                        '& .MuiButton-startIcon': {
                                            marginRight: 1,
                                        },
                                    }}
                                >
                                    <Box sx={{ textAlign: 'left', flex: 1 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {credential.label}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '0.7rem',
                                                opacity: 0.8,
                                                display: 'block',
                                            }}
                                        >
                                            {credential.realName || credential.role}
                                        </Typography>
                                        {credential.employeeId && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: '0.65rem',
                                                    opacity: 0.6,
                                                    display: 'block',
                                                    fontFamily: 'monospace',
                                                }}
                                            >
                                                {credential.employeeId}
                                            </Typography>
                                        )}
                                        {credential.platformRole && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    fontSize: '0.65rem',
                                                    opacity: 0.6,
                                                    display: 'block',
                                                    fontFamily: 'monospace',
                                                    color: '#dc3545',
                                                }}
                                            >
                                                {credential.platformRole}
                                            </Typography>
                                        )}
                                    </Box>
                                </Button>
                            </Grid>
                        ))}
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography
                        variant="caption"
                        sx={{
                            color: '#dc3545',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                        }}
                    >
                        ⚠️ Development Only - Remove in Production
                    </Typography>
                </Box>
            </Collapse>
        </Paper>
    );
};

export default QuickLoginHelper;