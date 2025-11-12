import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    Grid,
    Alert,
    Chip,
    Divider
} from '@mui/material';
import { BeachAccess as BeachAccessIcon, Send as SendIcon, AttachFile as AttachFileIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import leaveService from '../../services/leave.service';
import DataTable from '../../components/common/DataTable';
import Loading from '../../components/common/Loading';

const VacationRequestPage = () => {
    const [loading, setLoading] = useState(false);
    const [myRequests, setMyRequests] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [formData, setFormData] = useState({
        type: 'annual',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });
    const { showNotification } = useNotification();
    const { user } = useAuth();

    useEffect(() => {
        fetchMyRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMyRequests = async () => {
        try {
            setLoading(true);
            console.log('=== FETCHING LEAVE REQUESTS ===');
            console.log('User ID:', user._id);
            console.log('User object:', user);

            const data = await leaveService.getAll({ user: user._id });
            console.log('Raw data received:', data);
            console.log('Data type:', typeof data);
            console.log('Is array?', Array.isArray(data));

            // Data is already the array from the interceptor
            const requests = Array.isArray(data) ? data : (data.data || []);
            console.log('Processed requests:', requests);
            console.log('Number of requests:', requests.length);

            setMyRequests(requests);
        } catch (error) {
            console.error('=== FETCH ERROR ===');
            console.error('Error object:', error);
            console.error('Error type:', typeof error);
            const errorMessage = error?.message || (typeof error === 'string' ? error : 'Failed to fetch vacation requests');
            console.error('Error message:', errorMessage);
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear file when changing from sick to other type
        if (name === 'type' && value !== 'sick') {
            setSelectedFile(null);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type (PDF, images, documents)
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showNotification('Please upload a valid document (PDF, JPG, PNG, DOC, DOCX)', 'error');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('File size must be less than 5MB', 'error');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate document upload for sick leave
        if (formData.type === 'sick' && !selectedFile) {
            showNotification('Medical document is required for sick vacation', 'error');
            return;
        }

        try {
            setLoading(true);

            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('user', user._id);
            submitData.append('type', formData.type);
            submitData.append('startDate', formData.startDate);
            submitData.append('endDate', formData.endDate);

            // Only append reason if it's not empty
            if (formData.reason && formData.reason.trim()) {
                submitData.append('reason', formData.reason.trim());
            }

            if (selectedFile) {
                submitData.append('document', selectedFile);
            }

            await leaveService.create(submitData);
            showNotification('Vacation request submitted successfully', 'success');
            setFormData({
                type: 'annual',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: ''
            });
            setSelectedFile(null);
            fetchMyRequests();
        } catch (error) {
            console.error('Submit error:', error);
            console.error('Error response:', error.response);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to submit request';
            const errorDetails = error.response?.data?.details;

            if (errorDetails) {
                const detailsText = errorDetails.map(d => `${d.field}: ${d.message}`).join(', ');
                showNotification(`${errorMessage} - ${detailsText}`, 'error');
            } else {
                showNotification(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateDays = () => {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return days > 0 ? days : 0;
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'warning',
            approved: 'success',
            rejected: 'error',
            cancelled: 'default'
        };
        return colors[status] || 'default';
    };

    const columns = [
        {
            field: 'leaveType',
            headerName: 'Type',
            renderCell: (row) => (
                <Chip
                    label={row.leaveType || row.type}
                    size="small"
                    variant="outlined"
                    color="primary"
                />
            )
        },
        {
            field: 'startDate',
            headerName: 'Start Date',
            renderCell: (row) => new Date(row.startDate).toLocaleDateString()
        },
        {
            field: 'endDate',
            headerName: 'End Date',
            renderCell: (row) => new Date(row.endDate).toLocaleDateString()
        },
        {
            field: 'duration',
            headerName: 'Days',
            renderCell: (row) => row.duration || Math.ceil((new Date(row.endDate) - new Date(row.startDate)) / (1000 * 60 * 60 * 24)) + 1
        },
        {
            field: 'reason',
            headerName: 'Reason',
            renderCell: (row) => row.reason || '-'
        },
        {
            field: 'status',
            headerName: 'Status',
            renderCell: (row) => (
                <Chip
                    label={row.status?.toUpperCase() || 'PENDING'}
                    color={getStatusColor(row.status)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                />
            )
        },
        {
            field: 'workflow',
            headerName: 'Approval Status',
            renderCell: (row) => {
                const isSickLeave = row.leaveType === 'sick' || row.type === 'sick';
                const step = row.workflow?.currentStep;

                // For sick leave, show specific workflow status
                if (isSickLeave && row.status === 'pending') {
                    if (step === 'doctor-review') {
                        return (
                            <Chip
                                label="Awaiting Doctor"
                                color="warning"
                                size="small"
                                variant="outlined"
                            />
                        );
                    }
                    return (
                        <Chip
                            label="Pending Review"
                            color="info"
                            size="small"
                            variant="outlined"
                        />
                    );
                }

                const stepLabels = {
                    'supervisor-review': 'Supervisor Review',
                    'doctor-review': 'Doctor Review',
                    'completed': 'Completed',
                    'rejected': 'Rejected'
                };
                return (
                    <Typography variant="caption" color="text.secondary">
                        {stepLabels[step] || 'Pending'}
                    </Typography>
                );
            }
        },
        {
            field: 'createdAt',
            headerName: 'Submitted',
            renderCell: (row) => new Date(row.createdAt).toLocaleDateString()
        }
    ];

    if (loading && myRequests.length === 0) return <Loading />;

    return (
        <Box sx={{ p: 3, width: '100%', maxWidth: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BeachAccessIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                <Typography variant="h4">Vacation Request</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                {/* Request Guidelines - Full Width First */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Request Guidelines
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
                                <Alert severity="info">
                                    <Typography variant="body2">
                                        <strong>Annual Vacation:</strong> Regular vacation days from your annual allowance
                                    </Typography>
                                </Alert>
                            </Box>
                            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
                                <Alert severity="success">
                                    <Typography variant="body2">
                                        <strong>Casual Vacation:</strong> Short-term leave for personal matters
                                    </Typography>
                                </Alert>
                            </Box>
                            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
                                <Alert severity="warning">
                                    <Typography variant="body2">
                                        <strong>Sick Vacation:</strong> For medical reasons (requires medical document upload)
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                        Note: Sick Vacation requests must be approved by a doctor
                                    </Typography>
                                </Alert>
                            </Box>
                            <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '300px' }}>
                                <Alert severity="error">
                                    <Typography variant="body2">
                                        <strong>Unpaid Vacation:</strong> Time off without pay
                                    </Typography>
                                </Alert>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* Submit New Request - Full Width */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Submit New Request
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                                    <TextField
                                        select
                                        label="Leave Type"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="annual">Annual Vacation</option>
                                        <option value="casual">Casual Vacation</option>
                                        <option value="sick">Sick Vacation</option>
                                        <option value="unpaid">Unpaid Vacation</option>
                                    </TextField>
                                </Box>
                                <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                                    <TextField
                                        type="date"
                                        label="Start Date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Box>
                                <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                                    <TextField
                                        type="date"
                                        label="End Date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Box>
                                <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: '200px' }}>
                                    <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                                        Total Days: <strong style={{ marginLeft: '8px' }}>{calculateDays()}</strong>
                                    </Alert>
                                </Box>
                            </Box>

                            <TextField
                                label={formData.type === 'sick' ? 'Reason (Required)' : 'Reason (Optional)'}
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                multiline
                                rows={3}
                                required={formData.type === 'sick'}
                                fullWidth
                                placeholder={formData.type === 'sick' ? 'Please provide medical reason for sick vacation...' : 'Optionally provide a reason for your vacation request...'}
                            />

                            {formData.type === 'sick' && (
                                <Box>
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<AttachFileIcon />}
                                        fullWidth
                                    >
                                        {selectedFile ? 'Change Medical Document' : 'Upload Medical Document (Required)'}
                                        <input
                                            type="file"
                                            hidden
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={handleFileChange}
                                        />
                                    </Button>
                                    {selectedFile && (
                                        <Alert
                                            severity="success"
                                            sx={{ mt: 1 }}
                                            action={
                                                <Button
                                                    color="inherit"
                                                    size="small"
                                                    onClick={handleRemoveFile}
                                                    startIcon={<DeleteIcon />}
                                                >
                                                    Remove
                                                </Button>
                                            }
                                        >
                                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                                        </Alert>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)
                                    </Typography>
                                </Box>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<SendIcon />}
                                disabled={loading}
                                size="large"
                            >
                                Submit Request
                            </Button>
                        </Box>
                    </CardContent>
                </Card>

                {/* My Vacation Requests - Full Width */}
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            My Vacation Requests
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <DataTable
                            data={myRequests}
                            columns={columns}
                            emptyMessage="No vacation requests found. Submit a request to see it here."
                        />
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default VacationRequestPage;
