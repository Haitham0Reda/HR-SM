import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Avatar,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
  Extension as ExtensionIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import companyService from '../services/companyService';
import { useTheme } from '../contexts/ThemeContext';

// Add keyframes for animations
const pulseKeyframes = `
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}

const CompaniesPage = () => {
  const { theme } = useTheme();
  const [companies, setCompanies] = useState([]);
  const [, setAvailableModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [companyModules, setCompanyModules] = useState({});
  const [editCompanyData, setEditCompanyData] = useState({});

  // Form states
  const [newCompany, setNewCompany] = useState({
    name: '',
    industry: '',
    adminEmail: '',
    phone: '',
    address: '',
    modules: ['hr-core'],
    settings: {
      timezone: 'UTC',
      currency: 'USD',
      language: 'en'
    }
  });

  useEffect(() => {
    loadCompanies();
    loadAvailableModules();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyService.getAllCompanies();
      setCompanies(response.data.companies);
      setError(null);
    } catch (err) {
      setError('Failed to load companies: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModules = async () => {
    try {
      const response = await companyService.getAvailableModulesAndModels();
      setAvailableModules(response.data.moduleCategories);
    } catch (err) {
      console.error('Failed to load available modules:', err);
    }
  };

  const loadCompanyModules = async (companyName) => {
    try {
      const response = await companyService.getCompanyModules(companyName);
      setCompanyModules(response.data.availableModules);
      setSelectedCompany(companyName);
      setModuleDialogOpen(true);
    } catch (err) {
      setError('Failed to load company modules: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleCreateCompany = async () => {
    try {
      await companyService.createCompany(newCompany);
      setCreateDialogOpen(false);
      setNewCompany({
        name: '',
        industry: '',
        adminEmail: '',
        phone: '',
        address: '',
        modules: ['hr-core'],
        settings: {
          timezone: 'UTC',
          currency: 'USD',
          language: 'en'
        }
      });
      loadCompanies();
    } catch (err) {
      setError('Failed to create company: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleToggleModule = async (moduleName, enabled) => {
    try {
      if (enabled) {
        await companyService.enableModule(selectedCompany, moduleName);
      } else {
        await companyService.disableModule(selectedCompany, moduleName);
      }
      // Reload company modules
      loadCompanyModules(selectedCompany);
      // Reload companies to update the display
      loadCompanies();
    } catch (err) {
      setError('Failed to toggle module: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleViewDetails = async (companyName) => {
    try {
      const response = await companyService.getCompanyDetails(companyName);
      setSelectedCompanyData(response.data);
      setSelectedCompany(companyName);
      setDetailDialogOpen(true);
    } catch (err) {
      setError('Failed to load company details: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleEditCompany = (company) => {
    setEditCompanyData({
      name: company.metadata.name || '',
      industry: company.metadata.industry || '',
      adminEmail: company.metadata.adminEmail || '',
      phone: company.metadata.phone || '',
      address: company.metadata.address || '',
      settings: {
        timezone: company.metadata.settings?.timezone || 'UTC',
        currency: company.metadata.settings?.currency || 'USD',
        language: company.metadata.settings?.language || 'en',
        workingHours: {
          start: company.metadata.settings?.workingHours?.start || '09:00',
          end: company.metadata.settings?.workingHours?.end || '17:00'
        }
      }
    });
    setSelectedCompany(company.sanitizedName);
    setEditDialogOpen(true);
  };

  const handleUpdateCompany = async () => {
    try {
      await companyService.updateCompany(selectedCompany, editCompanyData);
      setEditDialogOpen(false);
      setEditCompanyData({});
      loadCompanies();
    } catch (err) {
      setError('Failed to update company: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const getStatusColor = (company) => {
    if (company.metadata.isActive === false) return 'error';
    if (company.statistics.error) return 'warning';
    return 'success';
  };

  const getStatusText = (company) => {
    if (company.metadata.isActive === false) return 'Inactive';
    if (company.statistics.error) return 'Error';
    return 'Active';
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          gap: 3
        }}>
          <Avatar sx={{ 
            width: 80, 
            height: 80, 
            bgcolor: 'primary.main',
            animation: 'pulse 2s infinite'
          }}>
            <BusinessIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Loading Companies
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Fetching company data and statistics...
            </Typography>
            <LinearProgress 
              sx={{ 
                borderRadius: 2,
                height: 8
              }} 
            />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Company Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and monitor all companies in your platform
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Company
          </Button>
        </Box>
        
        {/* Stats Overview */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {companies.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Companies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {companies.filter(c => c.metadata.isActive !== false).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Companies
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {companies.reduce((sum, c) => sum + (c.statistics.users || 0), 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {companies.map((company, index) => {
          const colors = ['primary', 'success', 'info', 'warning', 'secondary'];
          const cardColor = colors[index % colors.length];
          
          return (
            <Grid item xs={12} md={6} lg={4} key={company.sanitizedName}>
              <Card 
                sx={{ 
                  height: '100%',
                  '&:hover': {
                    boxShadow: 4,
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${cardColor}.main`,
                          width: 48, 
                          height: 48
                        }}
                      >
                        <BusinessIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" component="h2" fontWeight="bold">
                          {company.metadata.name || company.sanitizedName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {company.metadata.industry || 'Not specified'}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      icon={getStatusText(company) === 'Active' ? <CheckCircleIcon /> : 
                            getStatusText(company) === 'Error' ? <ErrorIcon /> : <WarningIcon />}
                      label={getStatusText(company)}
                      color={getStatusColor(company)}
                      size="small"
                    />
                  </Box>

                  {/* Stats Grid */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: 2, 
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                          <PeopleIcon fontSize="small" color="primary" />
                          <Typography variant="h6" fontWeight="bold">
                            {company.statistics.users || 0}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Users
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        textAlign: 'center', 
                        p: 2, 
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                          <StorageIcon fontSize="small" color="secondary" />
                          <Typography variant="h6" fontWeight="bold">
                            {company.statistics.departments || 0}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Departments
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Database Info */}
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'action.hover',
                    borderRadius: 1, 
                    mb: 3,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Database
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {company.database}
                    </Typography>
                  </Box>

                  {/* Modules Section */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <ExtensionIcon fontSize="small" color="success" />
                      <Typography variant="body2" fontWeight="600">
                        {company.metadata.modules?.length || 0} Modules Active
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {company.metadata.modules?.slice(0, 3).map((module) => (
                        <Chip 
                          key={module} 
                          label={module} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                      {company.metadata.modules?.length > 3 && (
                        <Chip 
                          label={`+${company.metadata.modules.length - 3} more`} 
                          size="small"
                          color={cardColor}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        onClick={() => handleViewDetails(company.sanitizedName)}
                        color="info"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Manage Modules">
                      <IconButton 
                        size="small" 
                        onClick={() => loadCompanyModules(company.sanitizedName)}
                        color="success"
                      >
                        <ExtensionIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Company">
                      <IconButton 
                        size="small"
                        onClick={() => handleEditCompany(company)}
                        color="warning"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Create Company Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Create New Company
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Industry"
                value={newCompany.industry}
                onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Admin Email"
                type="email"
                value={newCompany.adminEmail}
                onChange={(e) => setNewCompany({ ...newCompany, adminEmail: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newCompany.phone}
                onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={newCompany.settings.timezone}
                  onChange={(e) => setNewCompany({
                    ...newCompany,
                    settings: { ...newCompany.settings, timezone: e.target.value }
                  })}
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time</MenuItem>
                  <MenuItem value="America/Chicago">Central Time</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                  <MenuItem value="Europe/London">London</MenuItem>
                  <MenuItem value="Europe/Berlin">Berlin</MenuItem>
                  <MenuItem value="Asia/Dubai">Dubai</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={newCompany.address}
                onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateCompany} variant="contained">
            Create Company
          </Button>
        </DialogActions>
      </Dialog>

      {/* Module Management Dialog */}
      <Dialog 
        open={moduleDialogOpen} 
        onClose={() => setModuleDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Manage Modules - {selectedCompany}
        </DialogTitle>
        <DialogContent>
          <List>
            {Object.entries(companyModules).map(([moduleKey, moduleInfo]) => (
              <ListItem key={moduleKey}>
                <ListItemText
                  primary={moduleInfo.name}
                  secondary={moduleInfo.description}
                />
                <ListItemSecondaryAction>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={moduleInfo.enabled}
                        onChange={(e) => handleToggleModule(moduleKey, e.target.checked)}
                        disabled={!moduleInfo.canDisable}
                      />
                    }
                    label={moduleInfo.enabled ? 'Enabled' : 'Disabled'}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Company Details Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
            <VisibilityIcon />
          </Avatar>
          Company Details - {selectedCompanyData?.company?.name}
        </DialogTitle>
        <DialogContent>
          {selectedCompanyData && (
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  borderTop: '4px solid',
                  borderColor: 'primary.main',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px -8px rgba(255, 107, 107, 0.25)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <BusinessIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        Basic Information
                      </Typography>
                    </Box>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Company Name</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Industry</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.industry || 'Not specified'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Admin Email</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.adminEmail}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.phone || 'Not specified'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Address</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.address || 'Not specified'}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Settings */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  borderTop: '4px solid',
                  borderColor: 'secondary.main',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px -8px rgba(78, 205, 196, 0.25)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        <ExtensionIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        Settings
                      </Typography>
                    </Box>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Timezone</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.settings?.timezone || 'UTC'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Currency</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.settings?.currency || 'USD'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Language</Typography>
                        <Typography variant="body1">{selectedCompanyData.company.settings?.language || 'en'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Working Hours</Typography>
                        <Typography variant="body1">
                          {selectedCompanyData.company.settings?.workingHours?.start || '09:00'} - {selectedCompanyData.company.settings?.workingHours?.end || '17:00'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Statistics */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  borderTop: '4px solid',
                  borderColor: 'info.main',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px -8px rgba(51, 154, 240, 0.25)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'info.main' }}>
                        <TrendingUpIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        Statistics
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {Object.entries(selectedCompanyData.statistics).map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell component="th" scope="row">
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </TableCell>
                              <TableCell align="right">{value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Collections */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  borderTop: '4px solid',
                  borderColor: 'success.main',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px -8px rgba(81, 207, 102, 0.25)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <StorageIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        Database Collections
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Collection</TableCell>
                            <TableCell align="right">Documents</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedCompanyData.collections?.map((collection) => (
                            <TableRow key={collection.name}>
                              <TableCell component="th" scope="row">
                                {collection.name}
                              </TableCell>
                              <TableCell align="right">
                                {collection.documentCount !== undefined ? collection.documentCount : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Enabled Modules */}
              <Grid item xs={12}>
                <Card sx={{ 
                  borderTop: '4px solid',
                  borderColor: 'warning.main',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px -8px rgba(255, 217, 61, 0.25)'
                  }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'warning.main', color: 'black' }}>
                        <ExtensionIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        Enabled Modules
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {selectedCompanyData.company.modules?.map((module) => (
                        <Chip key={module} label={module} color="primary" variant="outlined" />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setDetailDialogOpen(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 25px -8px rgba(8, 145, 178, 0.5)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #ffd93d 0%, #ff8a65 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
            <EditIcon />
          </Avatar>
          Edit Company - {selectedCompany}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={editCompanyData.name || ''}
                onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Industry"
                value={editCompanyData.industry || ''}
                onChange={(e) => setEditCompanyData({ ...editCompanyData, industry: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Admin Email"
                type="email"
                value={editCompanyData.adminEmail || ''}
                onChange={(e) => setEditCompanyData({ ...editCompanyData, adminEmail: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={editCompanyData.phone || ''}
                onChange={(e) => setEditCompanyData({ ...editCompanyData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={editCompanyData.settings?.timezone || 'UTC'}
                  onChange={(e) => setEditCompanyData({
                    ...editCompanyData,
                    settings: { ...editCompanyData.settings, timezone: e.target.value }
                  })}
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="America/New_York">Eastern Time</MenuItem>
                  <MenuItem value="America/Chicago">Central Time</MenuItem>
                  <MenuItem value="America/Denver">Mountain Time</MenuItem>
                  <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                  <MenuItem value="Europe/London">London</MenuItem>
                  <MenuItem value="Europe/Berlin">Berlin</MenuItem>
                  <MenuItem value="Asia/Dubai">Dubai</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={editCompanyData.settings?.currency || 'USD'}
                  onChange={(e) => setEditCompanyData({
                    ...editCompanyData,
                    settings: { ...editCompanyData.settings, currency: e.target.value }
                  })}
                >
                  <MenuItem value="USD">USD - US Dollar</MenuItem>
                  <MenuItem value="EUR">EUR - Euro</MenuItem>
                  <MenuItem value="GBP">GBP - British Pound</MenuItem>
                  <MenuItem value="AED">AED - UAE Dirham</MenuItem>
                  <MenuItem value="SAR">SAR - Saudi Riyal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Working Hours Start"
                type="time"
                value={editCompanyData.settings?.workingHours?.start || '09:00'}
                onChange={(e) => setEditCompanyData({
                  ...editCompanyData,
                  settings: {
                    ...editCompanyData.settings,
                    workingHours: {
                      ...editCompanyData.settings?.workingHours,
                      start: e.target.value
                    }
                  }
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Working Hours End"
                type="time"
                value={editCompanyData.settings?.workingHours?.end || '17:00'}
                onChange={(e) => setEditCompanyData({
                  ...editCompanyData,
                  settings: {
                    ...editCompanyData.settings,
                    workingHours: {
                      ...editCompanyData.settings?.workingHours,
                      end: e.target.value
                    }
                  }
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                multiline
                rows={2}
                value={editCompanyData.address || ''}
                onChange={(e) => setEditCompanyData({ ...editCompanyData, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            sx={{ 
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'warning.main',
                bgcolor: 'rgba(255, 217, 61, 0.1)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateCompany} 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #ffd93d 0%, #ff8a65 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #f9c74f 0%, #ff5722 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 25px -8px rgba(255, 217, 61, 0.5)'
              }
            }}
          >
            Update Company
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompaniesPage;