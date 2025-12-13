import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { platformAPI } from '../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`module-tabpanel-${index}`}
      aria-labelledby={`module-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ModuleManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [companies, setCompanies] = useState([]);
  const [availableModules, setAvailableModules] = useState({});
  const [moduleStats, setModuleStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [licenseDialog, setLicenseDialog] = useState(false);
  const [bulkDialog, setBulkDialog] = useState(false);
  const [alert, setAlert] = useState(null);

  // Form states
  const [moduleForm, setModuleForm] = useState({
    moduleKey: '',
    tier: 'starter',
    customLimits: {
      employees: '',
      storage: '',
      apiCalls: ''
    }
  });

  const [bulkForm, setBulkForm] = useState({
    moduleKey: '',
    tier: 'starter',
    selectedCompanies: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [companiesRes, modulesRes, statsRes] = await Promise.all([
        platformAPI.get('/modules/companies'),
        platformAPI.get('/modules/available'),
        platformAPI.get('/modules/stats')
      ]);

      setCompanies(companiesRes.data.companies || []);
      setAvailableModules(modulesRes.data.modules || {});
      setModuleStats(statsRes.data || {});
    } catch (error) {
      showAlert('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, severity = 'info') => {
    setAlert({ message, severity });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEnableModule = async () => {
    try {
      const payload = {
        moduleKey: moduleForm.moduleKey,
        tier: moduleForm.tier
      };

      // Add custom limits if provided
      const customLimits = {};
      if (moduleForm.customLimits.employees) {
        customLimits.employees = parseInt(moduleForm.customLimits.employees);
      }
      if (moduleForm.customLimits.storage) {
        customLimits.storage = parseInt(moduleForm.customLimits.storage);
      }
      if (moduleForm.customLimits.apiCalls) {
        customLimits.apiCalls = parseInt(moduleForm.customLimits.apiCalls);
      }

      if (Object.keys(customLimits).length > 0) {
        payload.customLimits = customLimits;
      }

      await platformAPI.post(`/modules/companies/${selectedCompany.id}/enable`, payload);
      
      showAlert('Module enabled successfully', 'success');
      setModuleDialog(false);
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to enable module', 'error');
    }
  };

  const handleDisableModule = async (companyId, moduleKey) => {
    if (!window.confirm('Are you sure you want to disable this module?')) {
      return;
    }

    try {
      await platformAPI.post(`/modules/companies/${companyId}/disable`, { moduleKey });
      showAlert('Module disabled successfully', 'success');
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to disable module', 'error');
    }
  };

  const handleGenerateLicense = async (companyId) => {
    try {
      const response = await platformAPI.post(`/modules/companies/${companyId}/license`);
      showAlert('License generated successfully', 'success');
      
      // Optionally download the license file
      if (response.data.licenseData) {
        const blob = new Blob([JSON.stringify(response.data.licenseData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `license-${response.data.licenseData.licenseKey}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to generate license', 'error');
    }
  };

  const handleBulkEnable = async () => {
    try {
      await platformAPI.post('/modules/bulk/enable', {
        companyIds: bulkForm.selectedCompanies,
        moduleKey: bulkForm.moduleKey,
        tier: bulkForm.tier
      });

      showAlert('Bulk operation completed successfully', 'success');
      setBulkDialog(false);
      loadData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Bulk operation failed', 'error');
    }
  };

  const getModuleStatusColor = (enabled) => {
    return enabled ? 'success' : 'default';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'Unlimited';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Module Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setBulkDialog(true)}
          >
            Bulk Operations
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Companies & Modules" />
          <Tab label="Module Statistics" />
          <Tab label="Available Modules" />
        </Tabs>
      </Box>

      {/* Companies & Modules Tab */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Subscription</TableCell>
                <TableCell>Enabled Modules</TableCell>
                <TableCell>Usage</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{company.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {company.slug}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={company.status}
                      color={company.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{company.subscription.plan}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Expires: {new Date(company.subscription.endDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {company.enabledModules.map((moduleKey) => (
                        <Chip
                          key={moduleKey}
                          label={availableModules[moduleKey]?.name || moduleKey}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      Employees: {company.usage.employees}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Storage: {formatBytes(company.usage.storage)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Manage Modules">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedCompany(company);
                          setModuleDialog(true);
                        }}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Generate License">
                      <IconButton
                        size="small"
                        onClick={() => handleGenerateLicense(company.id)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Module Statistics Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Overall Stats */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Overall Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="h4" color="primary">
                      {moduleStats.overallStats?.totalCompanies || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Companies
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="h4" color="success.main">
                      {moduleStats.overallStats?.activeCompanies || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Companies
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="h4" color="warning.main">
                      {moduleStats.overallStats?.expiredSubscriptions || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Expired Subscriptions
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="h4" color="info.main">
                      {moduleStats.overallStats?.activePercentage || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Rate
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Module Stats */}
          {Object.entries(moduleStats.moduleStats || {}).map(([moduleKey, stats]) => (
            <Grid item xs={12} md={6} lg={4} key={moduleKey}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {stats.name}
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {stats.enabledCompanies}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Companies using this module
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={stats.enabledPercentage}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {stats.enabledPercentage}% adoption rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Available Modules Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {Object.entries(availableModules).map(([moduleKey, module]) => (
            <Grid item xs={12} md={6} lg={4} key={moduleKey}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {module.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    {module.description}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    <Chip label={module.category} size="small" />
                    {module.required && (
                      <Chip label="Required" size="small" color="error" />
                    )}
                  </Box>
                  <Typography variant="caption" display="block">
                    Available Tiers: {module.tiers.join(', ')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Module Management Dialog */}
      <Dialog open={moduleDialog} onClose={() => setModuleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Modules - {selectedCompany?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Module</InputLabel>
                <Select
                  value={moduleForm.moduleKey}
                  onChange={(e) => setModuleForm({ ...moduleForm, moduleKey: e.target.value })}
                >
                  {Object.entries(availableModules).map(([key, module]) => (
                    <MenuItem key={key} value={key}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tier</InputLabel>
                <Select
                  value={moduleForm.tier}
                  onChange={(e) => setModuleForm({ ...moduleForm, tier: e.target.value })}
                >
                  <MenuItem value="starter">Starter</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Custom Limits (optional)
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Max Employees"
                type="number"
                value={moduleForm.customLimits.employees}
                onChange={(e) => setModuleForm({
                  ...moduleForm,
                  customLimits: { ...moduleForm.customLimits, employees: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Storage (bytes)"
                type="number"
                value={moduleForm.customLimits.storage}
                onChange={(e) => setModuleForm({
                  ...moduleForm,
                  customLimits: { ...moduleForm.customLimits, storage: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="API Calls/Month"
                type="number"
                value={moduleForm.customLimits.apiCalls}
                onChange={(e) => setModuleForm({
                  ...moduleForm,
                  customLimits: { ...moduleForm.customLimits, apiCalls: e.target.value }
                })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleDialog(false)}>Cancel</Button>
          <Button onClick={handleEnableModule} variant="contained">
            Enable Module
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Operations Dialog */}
      <Dialog open={bulkDialog} onClose={() => setBulkDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Module Operations</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Module</InputLabel>
                <Select
                  value={bulkForm.moduleKey}
                  onChange={(e) => setBulkForm({ ...bulkForm, moduleKey: e.target.value })}
                >
                  {Object.entries(availableModules).map(([key, module]) => (
                    <MenuItem key={key} value={key}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tier</InputLabel>
                <Select
                  value={bulkForm.tier}
                  onChange={(e) => setBulkForm({ ...bulkForm, tier: e.target.value })}
                >
                  <MenuItem value="starter">Starter</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Select Companies
              </Typography>
              {companies.map((company) => (
                <FormControlLabel
                  key={company.id}
                  control={
                    <Switch
                      checked={bulkForm.selectedCompanies.includes(company.id)}
                      onChange={(e) => {
                        const selected = e.target.checked
                          ? [...bulkForm.selectedCompanies, company.id]
                          : bulkForm.selectedCompanies.filter(id => id !== company.id);
                        setBulkForm({ ...bulkForm, selectedCompanies: selected });
                      }}
                    />
                  }
                  label={company.name}
                />
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialog(false)}>Cancel</Button>
          <Button onClick={handleBulkEnable} variant="contained">
            Enable for Selected Companies
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}