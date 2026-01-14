/**
 * Family Members Page
 * 
 * Main page for viewing and managing all family members across insurance policies.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Stack,
    IconButton,
    Tooltip,
    Chip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import ModuleGuard from '../../components/ModuleGuard';
import PageContainer from '../../components/PageContainer';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useDialogs } from '../../hooks/useDialogs/useDialogs';
import insuranceService from '../../services/insurance.service';
import { formatDate } from '../../utils/formatters';

const FamilyMembersPage = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { showConfirmDialog } = useDialogs();
    
    const [familyMembers, setFamilyMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchFamilyMembers();
    }, []);

    const fetchFamilyMembers = async () => {
        try {
            setLoading(true);
            // Get all family members across all policies
            const response = await insuranceService.getAllFamilyMembers();
            setFamilyMembers(response.data || []);
        } catch (err) {
            setError(err.message || 'Failed to load family members');
        } finally {
            setLoading(false);
        }
    };

    const handleViewPolicy = (policyId) => {
        navigate(getCompanyRoute(`/insurance/policies/${policyId}`));
    };

    const handleManageFamilyMembers = (policyId) => {
        navigate(getCompanyRoute(`/insurance/policies/${policyId}/family`));
    };

    const handleDeleteMember = async (member) => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
        const confirmed = await showConfirmDialog({
            title: 'Delete Family Member',
            message: `Are you sure you want to remove ${fullName} from policy ${member.policyNumber}?`,
            confirmText: 'Delete',
            confirmColor: 'error'
        });

        if (confirmed) {
            try {
                await insuranceService.deleteFamilyMember(member.policyId, member._id);
                await fetchFamilyMembers();
            } catch (err) {
                setError(err.message || 'Failed to delete family member');
            }
        }
    };

    const columns = [
        {
            field: 'name',
            headerName: 'Name',
            width: 200,
            flex: 1,
            valueGetter: (value, row) => `${row.firstName || ''} ${row.lastName || ''}`.trim()
        },
        {
            field: 'relationship',
            headerName: 'Relationship',
            width: 120,
            valueFormatter: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
        },
        {
            field: 'dateOfBirth',
            headerName: 'Date of Birth',
            width: 130,
            valueFormatter: (value) => formatDate(value)
        },
        {
            field: 'gender',
            headerName: 'Gender',
            width: 100,
            valueFormatter: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
        },
        {
            field: 'policyNumber',
            headerName: 'Policy Number',
            width: 150,
            renderCell: (params) => (
                <Button
                    variant="text"
                    size="small"
                    onClick={() => handleViewPolicy(params.row.policyId)}
                    sx={{ textTransform: 'none' }}
                >
                    {params.value}
                </Button>
            )
        },
        {
            field: 'employeeName',
            headerName: 'Employee',
            width: 180
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === 'active' ? 'success' : 'default'}
                    size="small"
                />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="View Policy">
                        <IconButton
                            size="small"
                            onClick={() => handleViewPolicy(params.row.policyId)}
                        >
                            <ViewIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Manage Family Members">
                        <IconButton
                            size="small"
                            onClick={() => handleManageFamilyMembers(params.row.policyId)}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteMember(params.row)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )
        }
    ];

    if (loading) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Family Members"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Family Members' }
                    ]}
                >
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                        <CircularProgress />
                    </Box>
                </PageContainer>
            </ModuleGuard>
        );
    }

    if (error) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Family Members"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Family Members' }
                    ]}
                >
                    <Alert severity="error">{error}</Alert>
                </PageContainer>
            </ModuleGuard>
        );
    }

    return (
        <ModuleGuard moduleId="life-insurance">
            <PageContainer
                title="Family Members"
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Family Members' }
                ]}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate(getCompanyRoute('/insurance/policies'))}
                    >
                        Add Family Member
                    </Button>
                }
            >
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        All Family Members ({familyMembers.length})
                    </Typography>
                    
                    {familyMembers.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                                No family members found
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate(getCompanyRoute('/insurance/policies'))}
                            >
                                Go to Policies
                            </Button>
                        </Box>
                    ) : (
                        <Box sx={{ height: 600, width: '100%' }}>
                            <DataGrid
                                rows={familyMembers}
                                columns={columns}
                                pageSize={25}
                                rowsPerPageOptions={[25, 50, 100]}
                                disableSelectionOnClick
                                getRowId={(row) => row._id}
                                sx={{
                                    '& .MuiDataGrid-cell:focus': {
                                        outline: 'none'
                                    }
                                }}
                            />
                        </Box>
                    )}
                </Paper>
            </PageContainer>
        </ModuleGuard>
    );
};

export default FamilyMembersPage;