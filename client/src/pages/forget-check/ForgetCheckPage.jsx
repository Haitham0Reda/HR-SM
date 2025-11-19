import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import { useAuth } from '../../hooks/useAuth';
import { forgetCheckService } from '../../services';

const ForgetCheckPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [forgetChecks, setForgetChecks] = useState([]); // Initialize with empty array instead of undefined
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(),
    requestType: 'forget-check-in',
    requestedTime: new Date(),
    reason: ''
  });

  const fetchForgetChecks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching forget check requests...');
      
      // Test the API endpoint directly
      const token = localStorage.getItem('token');
      console.log('Auth token available:', !!token);
      console.log('User data:', user);
      console.log('User ID type:', typeof user?._id, 'User ID value:', user?._id);
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      if (!user) {
        throw new Error('User data not available. Please log in again.');
      }
      
      const data = await forgetCheckService.getAllForgetChecks();
      console.log('Forget check requests fetched successfully:', data);
      console.log('Total forget checks fetched:', Array.isArray(data) ? data.length : 0);
      
      // Debug: Log each forget check with employee info
      if (Array.isArray(data)) {
        console.log('All forget checks with employee info:');
        data.forEach((fc, index) => {
          console.log(`  ${index + 1}. ID: ${fc._id}`);
          console.log(`      Employee object:`, fc.employee);
          console.log(`      Employee ID: ${fc.employee?._id}`);
          console.log(`      Employee Name: ${fc.employee?.profile?.firstName} ${fc.employee?.profile?.lastName}`);
          console.log(`      Employee ID type: ${typeof fc.employee?._id}, User ID type: ${typeof user._id}`);
          
          // Check if employee object exists and has _id
          if (fc.employee && fc.employee._id) {
            const employeeIdStr = String(fc.employee._id);
            const userIdStr = String(user._id);
            console.log(`      String comparison - Employee ID: ${employeeIdStr}, User ID: ${userIdStr}, Match: ${employeeIdStr === userIdStr}`);
          } else {
            console.log(`      Warning: Employee object missing or missing _id property`);
          }
        });
      }
      
      setForgetChecks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching forget check requests:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        response: err.response,
        request: err.request
      });
      
      // More detailed error message
      let errorMessage = 'Failed to fetch forget check requests';
      if (err.response) {
        console.log('Response data:', err.response.data);
        console.log('Response status:', err.response.status);
        console.log('Response headers:', err.response.headers);
        errorMessage += `: ${err.response.status} - ${err.response.data?.error || err.response.data?.message || 'Server error'}`;
      } else if (err.request) {
        errorMessage += ': Network error - please check your connection';
      } else {
        errorMessage += `: ${err.message || 'Unknown error'}`;
      }
      
      setError(errorMessage);
      showError(errorMessage);
      setForgetChecks([]); // Set empty array on error to prevent undefined issues
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchForgetChecks();
  }, [fetchForgetChecks]);

  const showError = (message) => {
    setSnackbarMessage(message);
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  };

  const showSuccess = (message) => {
    setSnackbarMessage(message);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleShowNewRequestForm = () => {
    setShowNewRequestForm(true);
  };

  const handleBackToList = () => {
    setShowNewRequestForm(false);
    setFormData({
      date: new Date(),
      requestType: 'forget-check-in',
      requestedTime: new Date(),
      reason: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting forget check request with data:', formData);
      console.log('User data:', user);
      
      // Format date and time properly
      // For date, we want just the date part without time
      let formattedDate;
      if (formData.date instanceof Date) {
        formattedDate = new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate());
      } else {
        formattedDate = new Date(formData.date);
        formattedDate = new Date(formattedDate.getFullYear(), formattedDate.getMonth(), formattedDate.getDate());
      }
      
      // For requestedTime, we want just the time part
      let formattedRequestedTime;
      if (formData.requestedTime instanceof Date) {
        // Create a new date with today's date and the time from the picker
        const today = new Date();
        const timeParts = formData.requestedTime.toTimeString().split(' ')[0].split(':');
        formattedRequestedTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                         timeParts[0], timeParts[1], timeParts[2] || 0);
      } else {
        const today = new Date();
        const timeParts = new Date(formData.requestedTime).toTimeString().split(' ')[0].split(':');
        formattedRequestedTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                                         timeParts[0], timeParts[1], timeParts[2] || 0);
      }
      
      // Build request data with only the fields that exist
      const requestData = {
        date: formattedDate,
        requestType: formData.requestType,
        requestedTime: formattedRequestedTime,
        employee: user._id
      };
      
      // Add optional fields if they exist
      if (formData.reason) {
        requestData.reason = formData.reason;
      }
      
      // Only add department and position if they exist in the user object
      if (user.department) {
        requestData.department = user.department;
      }
      
      if (user.position) {
        requestData.position = user.position;
      }
      
      console.log('Sending request data:', requestData);
      await forgetCheckService.createForgetCheck(requestData);
      showSuccess('Forget check request submitted successfully');
      handleBackToList();
      fetchForgetChecks();
    } catch (err) {
      console.error('Error submitting forget check request:', err);
      showError('Error: ' + (err.message || 'Failed to submit forget check request'));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  // Render new request form as a full page
  if (showNewRequestForm) {
    return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Container maxWidth="lg">
          <Box sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <IconButton onClick={handleBackToList} sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4" component="h1" gutterBottom sx={{ flex: 1 }}>
                New Forget Check Request
              </Typography>
            </Box>
            
            <Paper sx={{ p: 3 }}>
              <Box
                component="form"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  maxWidth: 600,
                  margin: '0 auto'
                }}
                noValidate
              >
                <FormControl fullWidth>
                  <InputLabel>Request Type</InputLabel>
                  <Select
                    value={formData.requestType}
                    onChange={(e) => handleInputChange('requestType', e.target.value)}
                    label="Request Type"
                  >
                    <MenuItem value="forget-check-in">Forget Check-In</MenuItem>
                    <MenuItem value="forget-check-out">Forget Check-Out</MenuItem>
                  </Select>
                  <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                    Select whether you forgot to check in or check out
                  </Typography>
                </FormControl>
                
                <FormControl fullWidth>
                  <DatePicker
                    label="Date"
                    value={formData.date}
                    onChange={(newValue) => handleInputChange('date', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                  <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', display: 'block' }}>
                    Select the date you forgot to check in/out
                  </Typography>
                </FormControl>
                
                <FormControl fullWidth>
                  <TimePicker
                    label="Requested Time"
                    value={formData.requestedTime}
                    onChange={(newValue) => handleInputChange('requestedTime', newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                  <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', display: 'block' }}>
                    Enter the time you should have checked in/out
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <InfoIcon sx={{ fontSize: 16, color: 'warning.main', mr: 1 }} />
                    <Typography variant="caption" sx={{ color: 'warning.main' }}>
                      Working hours: 09:00 AM - 03:30 PM
                    </Typography>
                  </Box>
                </FormControl>
                
                <TextField
                  label="Reason (Optional)"
                  multiline
                  rows={4}
                  fullWidth
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                />
                <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                  Provide any additional details about why you forgot to check in/out
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button onClick={handleBackToList} variant="outlined">
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} variant="contained" color="primary">
                    Submit Request
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Container>
        
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </LocalizationProvider>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Forget Check Requests
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleShowNewRequestForm}
              sx={{ ml: 2 }}
            >
              New Request
            </Button>
          </Box>
          
          <Paper sx={{ p: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              centered
            >
              <Tab label="My Requests" />
              {['hr', 'admin'].includes(user.role) && <Tab label="All Requests" />}
            </Tabs>

            <Box sx={{ mt: 3 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error">{error}</Alert>
              ) : (
                <Box>
                  {activeTab === 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        My Forget Check Requests
                      </Typography>
                      {forgetChecks && Array.isArray(forgetChecks) && forgetChecks.filter(fc => fc.employee?._id === user._id).length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Typography sx={{ color: 'text.secondary', mb: 1 }}>
                            There are no requests to show
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            Submit a new forget check request using the "New Request" button above
                          </Typography>
                          {/* Debug information */}
                          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 2, display: 'block' }}>
                            Debug: Total requests: {Array.isArray(forgetChecks) ? forgetChecks.length : 0}, 
                            User ID: {user?._id}
                          </Typography>
                          {/* Additional debug info when there are requests but none match */}
                          {forgetChecks && Array.isArray(forgetChecks) && forgetChecks.length > 0 && (
                            <Typography variant="caption" sx={{ color: 'warning.main', mt: 1, display: 'block' }}>
                              Found {forgetChecks.length} total requests, but none match your user ID
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <TableContainer component={Paper}>
                          <Table sx={{ minWidth: 650 }} aria-label="forget check requests table">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Request Type</TableCell>
                                <TableCell>Requested Time</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {forgetChecks && Array.isArray(forgetChecks) && forgetChecks
                                .filter(fc => {
                                  // Handle potential type mismatches between IDs
                                  const employeeId = fc.employee?._id;
                                  const userId = user._id;
                                  
                                  // Convert both to strings for comparison if they exist
                                  const employeeIdStr = employeeId ? String(employeeId) : null;
                                  const userIdStr = userId ? String(userId) : null;
                                  
                                  const isMatch = employeeIdStr === userIdStr;
                                  console.log('Filtering request:', fc._id, 'Employee ID:', employeeIdStr, 'User ID:', userIdStr, 'Match:', isMatch);
                                  return isMatch;
                                })
                                .map(forgetCheck => (
                                  <TableRow
                                    key={forgetCheck._id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                  >
                                    <TableCell component="th" scope="row">
                                      {new Date(forgetCheck.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                      {forgetCheck.requestType === 'forget-check-in' ? 'Forget Check-In' : 'Forget Check-Out'}
                                    </TableCell>
                                    <TableCell>
                                      {new Date(forgetCheck.requestedTime).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell>
                                      {forgetCheck.reason || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      <Chip 
                                        label={forgetCheck.status} 
                                        color={getStatusColor(forgetCheck.status)}
                                        size="small"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))
                              }
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  )}

                  {activeTab === 1 && ['hr', 'admin'].includes(user.role) && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        All Forget Check Requests
                      </Typography>
                      {forgetChecks && Array.isArray(forgetChecks) && forgetChecks.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Typography sx={{ color: 'text.secondary', mb: 1 }}>
                            There are no requests to show
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            {user.role === 'employee' 
                              ? 'No forget check requests have been submitted yet' 
                              : 'No forget check requests exist in the system'}
                          </Typography>
                        </Box>
                      ) : (
                        <TableContainer component={Paper}>
                          <Table sx={{ minWidth: 650 }} aria-label="all forget check requests table">
                            <TableHead>
                              <TableRow>
                                <TableCell>Employee</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell>Request Type</TableCell>
                                <TableCell>Requested Time</TableCell>
                                <TableCell>Reason</TableCell>
                                <TableCell>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {forgetChecks && Array.isArray(forgetChecks) && forgetChecks.map(forgetCheck => (
                                <TableRow
                                  key={forgetCheck._id}
                                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                  <TableCell component="th" scope="row">
                                    {forgetCheck.employee?.profile?.firstName} {forgetCheck.employee?.profile?.lastName}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(forgetCheck.date).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    {forgetCheck.requestType === 'forget-check-in' ? 'Forget Check-In' : 'Forget Check-Out'}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(forgetCheck.requestedTime).toLocaleTimeString()}
                                  </TableCell>
                                  <TableCell>
                                    {forgetCheck.reason || 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={forgetCheck.status} 
                                      color={getStatusColor(forgetCheck.status)}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
};

export default ForgetCheckPage;