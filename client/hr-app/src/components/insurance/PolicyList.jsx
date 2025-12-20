/**
 * Policy List Component
 * 
 * Displays insurance policies in a data grid with actions.
 * Follows existing DataGrid patterns from EmployeeList.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    IconButton,
    Stack,
    Tooltip,
    Chip,
    Typography,
    Alert
} from '@mui/material';
import {
    DataGrid,
    GridActionsCellItem,
    gridClasses
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Group as FamilyIcon,
    Assignment as ClaimIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDialogs } from '../../hooks/useDialogs/useDialogs';
import { usePolicies } from '../../hooks/useInsurance';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import PageContainer from '../PageContainer';
import { formatCurrency, formatDate } from '../../utils/formatters';

const INITIAL_PAGE_SIZE = 10;

const PolicyList = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const [searchParams, setSearchParams] = useSearchParams();
    const dialogs = useDialogs();
    
    const {
        policies,
        loading,
        error,
        fetchPolicies,
        deletePolicy
    } = usePolicies();

    const [paginationModel, setPaginationModel] = useState({
        page: searchParams.get('page') ? Number(searchParams.get('page')) : 0,
        pageSize: searchParams.get('pageSize')
            ? Number(searchParams.get('pageSize'))
            : INITIAL_PAGE_SIZE,
    });

    const [filterModel, setFilterModel] = useState(
        searchParams.get('filter')
            ? JSON.parse(searchParams.get('filter') ?? '')
            : { items: [] },
    );

    const [sortModel, setSortModel] = useState(
        searchParams.get('sort') ? JSON.parse(searchParams.get('sort') ?? '') : [],
    );

    // Load policies on component mount and when filters change
    useEffect(() => {
        const params = {
            page: paginationModel.page + 1, // API uses 1-based pagination
            limit: paginationModel.pageSize,
            sort: sortModel.length > 0 ? `${sortModel[0].field}:${sortModel[0].sort}` : undefined,
            filter: filterModel.items.length > 0 ? JSON.stringify(filterModel.items) : undefined
        };
        
        fetchPolicies(params);
    }, [paginationModel, sortModel, filterModel, fetchPolicies]);

    const handlePaginationModelChange = useCallback((model) => {
        setPaginationModel(model);
        searchParams.set('page', String(model.page));
        searchParams.set('pageSize', String(model.pageSize));
        setSearchParams(searchParams);
    }, [searchParams, setSearchParams]);

    const handleFilterModelChange = useCallback((model) => {
        setFilterModel(model);
        if (model.items.length > 0) {
            searchParams.set('filter', JSON.stringify(model));
        } else {
            searchParams.delete('filter');
        }
        setSearchParams(searchParams);
    }, [searchParams, setSearchParams]);

    const handleSortModelChange = useCallback((model) => {
        setSortModel(model);
        if (model.length > 0) {
            searchParams.set('sort', JSON.stringify(model));
        } else {
            searchParams.delete('sort');
        }
        setSearchParams(searchParams);
    }, [searchParams, setSearchParams]);

    const handleRefresh = useCallback(() => {
        if (!loading) {
            fetchPolicies({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                sort: sortModel.length > 0 ? `${sortModel[0].field}:${sortModel[0].sort}` : undefined,
                filter: filterModel.items.length > 0 ? JSON.stringify(filterModel.items) : undefined
            });
        }
    }, [loading, fetchPolicies, paginationModel, sortModel, filterModel]);

    const handleCreateClick = useCallback(() => {
        navigate(getCompanyRoute('/insurance/policies/new'));
    }, [navigate, getCompanyRoute]);

    const handleRowClick = useCallback(({ row }) => {
        navigate(getCompanyRoute(`/insurance/policies/${row._id}`));
    }, [navigate, getCompanyRoute]);

    const handleRowView = useCallback((policy) => () => {
        navigate(getCompanyRoute(`/insurance/policies/${policy._id}`));
    }, [navigate, getCompanyRoute]);

    const handleRowEdit = useCallback((policy) => () => {
        navigate(getCompanyRoute(`/insurance/policies/${policy._id}/edit`));
    }, [navigate, getCompanyRoute]);

    const handleRowDelete = useCallback((policy) => async () => {
        const confirmed = await dialogs.confirm(
            `Do you wish to delete policy ${policy.policyNumber} for ${policy.employeeName}?`,
            {
                title: 'Delete Policy?',
                severity: 'error',
                okText: 'Delete',
                cancelText: 'Cancel',
            },
        );

        if (confirmed) {
            try {
                await deletePolicy(policy._id);
            } catch (error) {
                // Error handling is done in the hook
            }
        }
    }, [dialogs, deletePolicy]);

    const handleFamilyMembers = useCallback((policy) => () => {
        navigate(getCompanyRoute(`/insurance/policies/${policy._id}/family`));
    }, [navigate, getCompanyRoute]);

    const handleClaims = useCallback((policy) => () => {
        navigate(getCompanyRoute(`/insurance/policies/${policy._id}/claims`));
    }, [navigate, getCompanyRoute]);

    const getStatusChip = (status) => {
        const statusConfig = {
            active: { color: 'success', label: 'Active' },
            expired: { color: 'error', label: 'Expired' },
            cancelled: { color: 'default', label: 'Cancelled' },
            suspended: { color: 'warning', label: 'Suspended' }
        };

        const config = statusConfig[status] || { color: 'default', label: status };
        return <Chip size="small" color={config.color} label={config.label} />;
    };

    const columns = [
        {
            field: 'policyNumber',
            headerName: 'Policy Number',
            width: 150,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium">
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'employeeName',
            headerName: 'Employee',
            width: 200,
            valueGetter: (value, row) => row.employee?.name || 'N/A'
        },
        {
            field: 'employeeNumber',
            headerName: 'Employee ID',
            width: 120,
            valueGetter: (value, row) => row.employee?.employeeNumber || 'N/A'
        },
        {
            field: 'policyType',
            headerName: 'Type',
            width: 100,
            renderCell: (params) => (
                <Chip size="small" variant="outlined" label={params.value} />
            )
        },
        {
            field: 'coverageAmount',
            headerName: 'Coverage',
            width: 120,
            type: 'number',
            renderCell: (params) => formatCurrency(params.value)
        },
        {
            field: 'premium',
            headerName: 'Premium',
            width: 100,
            type: 'number',
            renderCell: (params) => formatCurrency(params.value)
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            width: 120,
            type: 'date',
            valueGetter: (value) => value ? new Date(value) : null,
            renderCell: (params) => formatDate(params.value)
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            width: 120,
            type: 'date',
            valueGetter: (value) => value ? new Date(value) : null,
            renderCell: (params) => formatDate(params.value)
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => getStatusChip(params.value)
        },
        {
            field: 'familyMembersCount',
            headerName: 'Family',
            width: 80,
            type: 'number',
            valueGetter: (value, row) => row.familyMembers?.length || 0
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 200,
            getActions: ({ row }) => [
                <GridActionsCellItem
                    key="view"
                    icon={<ViewIcon />}
                    label="View"
                    onClick={handleRowView(row)}
                />,
                <GridActionsCellItem
                    key="edit"
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={handleRowEdit(row)}
                />,
                <GridActionsCellItem
                    key="family"
                    icon={<FamilyIcon />}
                    label="Family Members"
                    onClick={handleFamilyMembers(row)}
                />,
                <GridActionsCellItem
                    key="claims"
                    icon={<ClaimIcon />}
                    label="Claims"
                    onClick={handleClaims(row)}
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={handleRowDelete(row)}
                    sx={{ color: 'error.main' }}
                />
            ],
        },
    ];

    const pageTitle = 'Insurance Policies';

    return (
        <PageContainer
            title={pageTitle}
            breadcrumbs={[
                { title: 'Insurance', path: getCompanyRoute('/insurance') },
                { title: pageTitle }
            ]}
            actions={
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Tooltip title="Reload data" placement="right" enterDelay={1000}>
                        <div>
                            <IconButton 
                                size="small" 
                                aria-label="refresh" 
                                onClick={handleRefresh}
                                disabled={loading}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </div>
                    </Tooltip>
                    <Button
                        variant="contained"
                        onClick={handleCreateClick}
                        startIcon={<AddIcon />}
                    >
                        Create Policy
                    </Button>
                </Stack>
            }
        >
            <Box sx={{ flex: 1, width: '100%' }}>
                {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : (
                    <DataGrid
                        rows={policies}
                        columns={columns}
                        getRowId={(row) => row._id}
                        pagination
                        paginationMode="server"
                        sortingMode="server"
                        filterMode="server"
                        paginationModel={paginationModel}
                        onPaginationModelChange={handlePaginationModelChange}
                        sortModel={sortModel}
                        onSortModelChange={handleSortModelChange}
                        filterModel={filterModel}
                        onFilterModelChange={handleFilterModelChange}
                        loading={loading}
                        disableRowSelectionOnClick
                        onRowClick={handleRowClick}
                        pageSizeOptions={[5, INITIAL_PAGE_SIZE, 25, 50]}
                        sx={{
                            [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                                outline: 'transparent',
                            },
                            [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]: {
                                outline: 'none',
                            },
                            [`& .${gridClasses.row}:hover`]: {
                                cursor: 'pointer',
                            },
                        }}
                        slotProps={{
                            loadingOverlay: {
                                variant: 'circular-progress',
                                noRowsVariant: 'circular-progress',
                            },
                            baseIconButton: {
                                size: 'small',
                            },
                        }}
                    />
                )}
            </Box>
        </PageContainer>
    );
};

export default PolicyList;