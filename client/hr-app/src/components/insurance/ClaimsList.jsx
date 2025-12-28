/**
 * Claims List Component
 * 
 * Displays insurance claims in a data grid with actions.
 * Follows existing request/approval component patterns.
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
    Visibility as ViewIcon,
    RateReview as ReviewIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClaims } from '../../hooks/useInsurance';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useAuth } from '../../store/providers/ReduxAuthProvider';
import PageContainer from '../PageContainer';
import { formatCurrency, formatDate } from '../../utils/formatters';

const INITIAL_PAGE_SIZE = 10;

const ClaimsList = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isHR, isAdmin } = useAuth();
    
    const {
        claims,
        loading,
        error,
        fetchClaims
    } = useClaims();

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

    const canReview = isHR || isAdmin;

    // Load claims on component mount and when filters change
    useEffect(() => {
        const params = {
            page: paginationModel.page + 1,
            limit: paginationModel.pageSize,
            sort: sortModel.length > 0 ? `${sortModel[0].field}:${sortModel[0].sort}` : undefined,
            filter: filterModel.items.length > 0 ? JSON.stringify(filterModel.items) : undefined
        };
        
        fetchClaims(params);
    }, [paginationModel, sortModel, filterModel, fetchClaims]);

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
            fetchClaims({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                sort: sortModel.length > 0 ? `${sortModel[0].field}:${sortModel[0].sort}` : undefined,
                filter: filterModel.items.length > 0 ? JSON.stringify(filterModel.items) : undefined
            });
        }
    }, [loading, fetchClaims, paginationModel, sortModel, filterModel]);

    const handleCreateClick = useCallback(() => {
        navigate(getCompanyRoute('/insurance/claims/new'));
    }, [navigate, getCompanyRoute]);

    const handleRowClick = useCallback(({ row }) => {
        navigate(getCompanyRoute(`/insurance/claims/${row._id}`));
    }, [navigate, getCompanyRoute]);

    const handleRowView = useCallback((claim) => () => {
        navigate(getCompanyRoute(`/insurance/claims/${claim._id}`));
    }, [navigate, getCompanyRoute]);

    const handleRowReview = useCallback((claim) => () => {
        navigate(getCompanyRoute(`/insurance/claims/${claim._id}/review`));
    }, [navigate, getCompanyRoute]);

    const getStatusChip = (status) => {
        const statusConfig = {
            pending: { color: 'warning', label: 'Pending' },
            under_review: { color: 'info', label: 'Under Review' },
            approved: { color: 'success', label: 'Approved' },
            rejected: { color: 'error', label: 'Rejected' },
            paid: { color: 'success', label: 'Paid' }
        };

        const config = statusConfig[status] || { color: 'default', label: status };
        return <Chip size="small" color={config.color} label={config.label} />;
    };

    const columns = [
        {
            field: 'claimNumber',
            headerName: 'Claim Number',
            width: 150,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="medium">
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'policyNumber',
            headerName: 'Policy Number',
            width: 150,
            valueGetter: (value, row) => row.policy?.policyNumber || 'N/A'
        },
        {
            field: 'employeeName',
            headerName: 'Employee',
            width: 200,
            valueGetter: (value, row) => row.employee?.name || 'N/A'
        },
        {
            field: 'claimType',
            headerName: 'Type',
            width: 120,
            renderCell: (params) => (
                <Chip size="small" variant="outlined" label={params.value} />
            )
        },
        {
            field: 'claimAmount',
            headerName: 'Amount',
            width: 120,
            type: 'number',
            renderCell: (params) => formatCurrency(params.value)
        },
        {
            field: 'claimDate',
            headerName: 'Claim Date',
            width: 120,
            type: 'date',
            valueGetter: (value) => value ? new Date(value) : null,
            renderCell: (params) => formatDate(params.value)
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            renderCell: (params) => getStatusChip(params.value)
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 150,
            getActions: ({ row }) => {
                const actions = [
                    <GridActionsCellItem
                        key="view"
                        icon={<ViewIcon />}
                        label="View"
                        onClick={handleRowView(row)}
                    />
                ];

                // Add review action for HR/Admin on pending/under_review claims
                if (canReview && ['pending', 'under_review'].includes(row.status)) {
                    actions.push(
                        <GridActionsCellItem
                            key="review"
                            icon={<ReviewIcon />}
                            label="Review"
                            onClick={handleRowReview(row)}
                        />
                    );
                }

                return actions;
            },
        },
    ];

    const pageTitle = 'Insurance Claims';

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
                        Submit Claim
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
                        rows={claims}
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

export default ClaimsList;
