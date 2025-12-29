import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip,
  Avatar,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TablePagination,
  Fab,
  Menu,
  ListItemButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Computer as ComputerIcon,
  Info as InfoIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  History as HistoryIcon,
  Analytics as AnalyticsIcon,
  Assignment as AssignmentIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchLicensesAsync,
  fetchLicenseAnalyticsAsync,
  fetchExpiringLicensesAsync,
  createLicenseAsync,
  renewLicenseAsync,
  revokeLicenseAsync,
  setFilters,
  clearError,
  setCurrentLicense,
  clearCurrentLicense,
} from '../store/slices/licenseManagementSlice';
import { fetchTenantsAsync } from '../store/slices/tenantManagementSlice';
import LicenseManager from '../components/LicenseManager';

const LicensesPage = () => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const { 
    licenses, 
    loading, 
    error, 
    analytics, 
    pagination, 
    filters 
  } = useAppSelector(state => state.licenseManagement);
  const { tenants } = useAppSelector(state => state.tenantManagement);

  // Local state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [licenseManagerOpen, setLicenseManagerOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [newLicense, setNewLicense] = useState({
    tenantId: '',
    type: 'basic',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    features: {
      maxUsers: 50,
      maxStorage: 1024, // MB
      maxAPICallsPerMonth: 10000,
      modules: ['hr-core', 'attendance', 'payroll'],
    },
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [dispatch, pagination.page, pagination.limit, filters]);

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchLicensesAsync({
          page: pagination.page,
          limit: pagination.limit,
          search: filters.search,
          status: filters.status,
          type: filters.type,
        })),
        dispatch(fetchLicenseAnalyticsAsync()),
        dispatch(fetchExpiringLicensesAsync(30)),
        dispatch(fetchTenantsAsync({ limit: 100 })), // Get all tenants for dropdown
      ]);
    } catch (error) {
      console.error('Failed to load license data:', error);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const handleSearch = () => {
    dispatch(setFilters({ search: searchTerm }));
  };

  const handleFilterChange = (filterName, value) => {
    dispatch(setFilters({ [filterName]: value }));
  };

  const handlePageChange = (event, newPage) => {
    dispatch(fetchLicensesAsync({
      page: newPage + 1,
      limit: pagination.limit,
      search: filters.search,
      status: filters.status,
      type: filters.type,
    }));
  };

  const handleRowsPerPageChange = (event) => {
    const newLimit = parseInt(event.target.value, 10);
    dispatch(fetchLicensesAsync({
      page: 1,
      limit: newLimit,
      search: filters.search,
      status: filters.status,
      type: filters.type,
    }));
  };

  const handleCreateLicense = async () => {
    try {
      await dispatch(createLicenseAsync(newLicense));
      setCreateDialogOpen(false);
      setNewLicense({
        tenantId: '',
        type: 'basic',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        features: {
          maxUsers: 50,
          maxStorage: 1024,
          maxAPICallsPerMonth: 10000,
          modules: ['hr-core', 'attendance', 'payroll'],
        },
        notes: '',
      });
      loadData(); // Refresh data
    } catch (error) {
      console.error('Failed to create license:', error);
    }
  };

  const handleActionMenuOpen = (event, license) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedLicense(license);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedLicense(null);
  };

  const handleViewLicense = (license) => {
    const tenant = tenants.find(t => t._id === license.tenantId);
    setSelectedTenant(tenant);
    dispatch(setCurrentLicense(license));
    setLicenseManagerOpen(true);
    handleActionMenuClose();
  };

  const handleAssignLicense = (license) => {
    // Open assignment dialog
    handleActionMenuClose();
  };

  const getLicenseStatus = (license) => {
    if (!license) return 'unknown';
    
    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (license.status === 'revoked') return 'revoked';
    if (license.status === 'suspended') return 'suspended';
    if (expiresAt < now) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'active';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon color="success" />;
      case 'expiring':
        return <ScheduleIcon color="warning" />;
      case 'expired':
        return <ErrorIcon color="error" />;
      case 'revoked':
      case 'suspended':
        return <BlockIcon color="error" />;
      default:
        return <InfoIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expiring':
        return 'warning';
      case 'expired':
      case 'revoked':
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t._id === tenantId);
    return tenant ? tenant.name : 'Unknown Tenant';
  };

  const availableModules = [
    'hr-core',
    'attendance',
    'payroll',
    'vacation',
    'tasks',
    'documents',
    'missions',
    'overtime',
    'reports',
    'analytics',
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <SecurityIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="600">
              License Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage licenses, monitor usage, and track analytics
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => setAnalyticsDialogOpen(true)}
          >
            Analytics
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create License
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => dispatch(clearError())}
        >
          {error.message}
        </Alert>
      )}

      {/* Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SecurityIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {analytics.totalLicenses || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Licenses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {analytics.activeLicenses || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Licenses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {analytics.expiringLicenses?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expiring Soon
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <ErrorIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="700">
                    {(analytics.expiredLicenses || 0) + (analytics.revokedLicenses || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inactive Licenses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search licenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expiring">Expiring</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="revoked">Revoked</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="trial">Trial</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                  <MenuItem value="unlimited">Unlimited</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  disabled={loading}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FilterListIcon />}
                  onClick={() => {
                    setSearchTerm('');
                    dispatch(setFilters({ search: '', status: 'all', type: 'all' }));
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Licenses Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && <LinearProgress />}
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>License Number</TableCell>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Max Users</TableCell>
                  <TableCell>Modules</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {licenses.map((license) => {
                  const status = getLicenseStatus(license);
                  return (
                    <TableRow key={license.licenseNumber} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {license.licenseNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getTenantName(license.tenantId)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={license.type?.toUpperCase()}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(status)}
                          <Chip
                            label={status.toUpperCase()}
                            color={getStatusColor(status)}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(license.expiresAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {license.features?.maxUsers || 'Unlimited'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {license.features?.modules?.slice(0, 2).map((module) => (
                            <Chip
                              key={module}
                              label={module}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {license.features?.modules?.length > 2 && (
                            <Chip
                              label={`+${license.features.modules.length - 2}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleActionMenuOpen(e, license)}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            onPageChange={handlePageChange}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="create license"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem onClick={() => handleViewLicense(selectedLicense)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAssignLicense(selectedLicense)}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Assign to Tenant</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleActionMenuClose}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Audit Trail</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export License</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create License Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New License</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tenant</InputLabel>
                <Select
                  value={newLicense.tenantId}
                  onChange={(e) => setNewLicense({ ...newLicense, tenantId: e.target.value })}
                  label="Tenant"
                >
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant._id} value={tenant._id}>
                      {tenant.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>License Type</InputLabel>
                <Select
                  value={newLicense.type}
                  onChange={(e) => setNewLicense({ ...newLicense, type: e.target.value })}
                  label="License Type"
                >
                  <MenuItem value="trial">Trial</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                  <MenuItem value="unlimited">Unlimited</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Expiry Date"
                value={newLicense.expiresAt}
                onChange={(value) => setNewLicense({ ...newLicense, expiresAt: value })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Users"
                type="number"
                value={newLicense.features.maxUsers}
                onChange={(e) => setNewLicense({
                  ...newLicense,
                  features: { ...newLicense.features, maxUsers: parseInt(e.target.value) }
                })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Storage (MB)"
                type="number"
                value={newLicense.features.maxStorage}
                onChange={(e) => setNewLicense({
                  ...newLicense,
                  features: { ...newLicense.features, maxStorage: parseInt(e.target.value) }
                })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Calls/Month"
                type="number"
                value={newLicense.features.maxAPICallsPerMonth}
                onChange={(e) => setNewLicense({
                  ...newLicense,
                  features: { ...newLicense.features, maxAPICallsPerMonth: parseInt(e.target.value) }
                })}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Enabled Modules</InputLabel>
                <Select
                  multiple
                  value={newLicense.features.modules}
                  onChange={(e) => setNewLicense({
                    ...newLicense,
                    features: { ...newLicense.features, modules: e.target.value }
                  })}
                  label="Enabled Modules"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableModules.map((module) => (
                    <MenuItem key={module} value={module}>
                      {module}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={newLicense.notes}
                onChange={(e) => setNewLicense({ ...newLicense, notes: e.target.value })}
                placeholder="Optional notes about this license..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateLicense}
            disabled={loading || !newLicense.tenantId}
          >
            Create License
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsDialogOpen} onClose={() => setAnalyticsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>License Analytics</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    License Distribution
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Active Licenses"
                        secondary={`${analytics.activeLicenses || 0} licenses`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ScheduleIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Expiring Soon"
                        secondary={`${analytics.expiringLicenses?.length || 0} licenses`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Expired"
                        secondary={`${analytics.expiredLicenses || 0} licenses`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <BlockIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Revoked"
                        secondary={`${analytics.revokedLicenses || 0} licenses`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Expiring Licenses
                  </Typography>
                  {analytics.expiringLicenses?.length > 0 ? (
                    <List>
                      {analytics.expiringLicenses.slice(0, 5).map((license) => (
                        <ListItem key={license.licenseNumber}>
                          <ListItemText
                            primary={getTenantName(license.tenantId)}
                            secondary={`Expires: ${formatDate(license.expiresAt)}`}
                          />
                          <Chip
                            label={license.type}
                            size="small"
                            variant="outlined"
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No licenses expiring in the next 30 days
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* License Manager Dialog */}
      <LicenseManager
        open={licenseManagerOpen}
        onClose={() => {
          setLicenseManagerOpen(false);
          setSelectedTenant(null);
          dispatch(clearCurrentLicense());
        }}
        tenantId={selectedTenant?._id}
        tenantName={selectedTenant?.name}
      />
    </Box>
  );
};

export default LicensesPage;