/**
 * Policy Family Members Page
 * 
 * Page for managing family members covered under an insurance policy.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Stack,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import ModuleGuard from '../../components/ModuleGuard';
import PageContainer from '../../components/PageContainer';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useDialogs } from '../../hooks/useDialogs/useDialogs';
import insuranceService from '../../services/insurance.service';
import { formatDate } from '../../utils/formatters';
import FamilyMemberModal from '../../components/insurance/FamilyMemberModal';

const PolicyFamilyMembersPage = () => {
    const { policyId } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { showConfirmDialog } = useDialogs();
    
    const [policy, setPolicy] = useState(null);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    useEffect(() => {
        fetchPolicyAndMembers();
    }, [policyId]);

    const fetchPolicyAndMembers = async () => {
        try {
            setLoading(true);
            const [policyResponse, membersResponse] = await Promise.all([
                insuranceService.getPolicyById(policyId),
                insuranceService.getFamilyMembers(policyId)
            ]);
            
            setPolicy(policyResponse.data);
            setFamilyMembers(membersResponse.data || []);
        } catch (err) {
            setError(err.message || 'Failed to load policy and family members');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = () => {
        setSelectedMember(null);
        setModalOpen(true);
    };

    const handleEditMember = (member) => {
        setSelectedMember(member);
        setModalOpen(true);
    };

    const handleDeleteMember = async (member) => {
        const confirmed = await showConfirmDialog({
            title: 'Delete Family Member',
            message: `Are you sure you want to remove ${member.name} from this policy?`,
            confirmText: 'Delete',
            confirmColor: 'error'
        });

        if (confirmed) {
            try {
                await insuranceService.deleteFamilyMember(policyId, member._id);
                await fetchPolicyAndMembers();
            } catch (err) {
                setError(err.message || 'Failed to delete family member');
            }
        }
    };

    const handleSaveMember = async (memberData) => {
        try {
            if (selectedMember) {
                await insuranceService.updateFamilyMember(policyId, selectedMember._id, memberData);
            } else {
                await insuranceService.addFamilyMember(policyId, memberData);
            }
            
            setModalOpen(false);
            await fetchPolicyAndMembers();
        } catch (err) {
            throw new Error(err.message || 'Failed to save family member');
        }
    };

    const handleBack = () => {
        navigate(getCompanyRoute(`/insurance/policies/${policyId}`));
    };

    const columns = [
        {
            field: 'name',
            headerName: 'Name',
            width: 200,
            flex: 1
        },
        {
            field: 'relationship',
            headerName: 'Relationship',
            width: 150
        },
        {
            field: 'dateOfBirth',
            headerName: 'Date of Birth',
            width: 150,
            valueFormatter: (value) => formatDate(value)
        },
        {
            field: 'gender',
            headerName: 'Gender',
            width: 100
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Box
                    sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: params.value === 'active' ? 'success.light' : 'grey.300',
                        color: params.value === 'active' ? 'success.contrastText' : 'text.primary',
                        fontSize: '0.75rem'
                    }}
                >
                    {params.value}
                </Box>
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Edit">
                        <IconButton
                            size="small"
                            onClick={() => handleEditMember(params.row)}
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
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Policy Details', path: getCompanyRoute(`/insurance/policies/${policyId}`) },
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
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Policy Details', path: getCompanyRoute(`/insurance/policies/${policyId}`) },
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
                title={`Family Members - Policy ${policy?.policyNumber}`}
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                    { title: 'Policy Details', path: getCompanyRoute(`/insurance/policies/${policyId}`) },
                    { title: 'Family Members' }
                ]}
                actions={
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleBack}
                        >
                            Back to Policy
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddMember}
                        >
                            Add Family Member
                        </Button>
                    </Stack>
                }
            >
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Family Members ({familyMembers.length})
                    </Typography>
                    
                    <Box sx={{ height: 400, width: '100%' }}>
                        <DataGrid
                            rows={familyMembers}
                            columns={columns}
                            pageSize={10}
                            rowsPerPageOptions={[10, 25, 50]}
                            disableSelectionOnClick
                            getRowId={(row) => row._id}
                            sx={{
                                '& .MuiDataGrid-cell:focus': {
                                    outline: 'none'
                                }
                            }}
                        />
                    </Box>
                </Paper>

                <FamilyMemberModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveMember}
                    member={selectedMember}
                    policyId={policyId}
                />
            </PageContainer>
        </ModuleGuard>
    );
};

export default PolicyFamilyMembersPage;