import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Alert
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import userService from '../../services/user.service';

const TaskForm = ({ open, onClose, onSubmit, task }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        assignee: '',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default to 1 week from now
    });

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        console.log('TaskForm useEffect triggered', { open, task });
        if (open) {
            console.log('Fetching users because form is open');
            fetchUsers();
            if (task) {
                console.log('Setting form data for existing task:', task);
                setFormData({
                    title: task.title || '',
                    description: task.description || '',
                    priority: task.priority || 'medium',
                    assignee: task.assignee?._id || '',
                    startDate: task.startDate ? new Date(task.startDate) : new Date(),
                    dueDate: task.dueDate ? new Date(task.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
            } else {
                console.log('Setting form data for new task');
                setFormData({
                    title: '',
                    description: '',
                    priority: 'medium',
                    assignee: '',
                    startDate: new Date(),
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
            }
            setError('');
        } else {
            // Reset form when dialog is closed to prevent controlled/uncontrolled issues
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                assignee: '',
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });
        }
    }, [open, task]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            console.log('Fetching users...');
            const response = await userService.getAll();
            console.log('Users response:', response);

            // Handle both response.data and response directly (since api service extracts data)
            const usersData = Array.isArray(response) ? response : (response.data || []);
            console.log('Processed users data:', usersData);

            if (Array.isArray(usersData)) {
                // For debugging, let's first set all users to see if the issue is with filtering
                console.log('Setting all users (before filtering):', usersData);
                setUsers(usersData);

                // Then filter for active users, but also handle cases where isActive might not be present
                // const activeUsers = usersData.filter(user => {
                //   // If isActive field exists, use it, otherwise assume active
                //   const isActive = user.isActive !== undefined ? user.isActive : true;
                //   return isActive;
                // });
                // console.log('Active users:', activeUsers);
                // setUsers(activeUsers);
            } else {
                console.error('Unexpected response format:', response);
                setError('Failed to load users: Invalid response format');
            }
        } catch (err) {
            console.error('Error fetching users:', err);
            console.error('Error details:', {
                message: err.message,
                status: err.status,
                data: err.data
            });
            setError(`Failed to load users: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDateChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validation
            if (!formData.title.trim()) {
                setError('Title is required');
                return;
            }

            if (!formData.description.trim()) {
                setError('Description is required');
                return;
            }

            if (!formData.assignee) {
                setError('Assignee is required');
                return;
            }

            if (formData.startDate >= formData.dueDate) {
                setError('Due date must be after start date');
                return;
            }

            await onSubmit({
                ...formData,
                startDate: formData.startDate.toISOString(),
                dueDate: formData.dueDate.toISOString()
            });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {task ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="title"
                        label="Task Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        autoFocus
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="description"
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        multiline
                        rows={4}
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="priority-label">Priority</InputLabel>
                        <Select
                            labelId="priority-label"
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            label="Priority"
                            onChange={handleChange}
                        >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="urgent">Urgent</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="assignee-label">Assign To</InputLabel>
                        <Select
                            labelId="assignee-label"
                            id="assignee"
                            name="assignee"
                            value={formData.assignee}
                            label="Assign To"
                            onChange={handleChange}
                            disabled={loading}
                            displayEmpty
                        >
                            {loading ? (
                                <MenuItem value="" disabled>
                                    Loading users...
                                </MenuItem>
                            ) : users.length === 0 ? (
                                <MenuItem value="" disabled>
                                    No active users available
                                </MenuItem>
                            ) : (
                                users.map(user => (
                                    <MenuItem key={user._id} value={user._id}>
                                        {user.personalInfo?.fullName || user.username}
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>

                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            label="Start Date"
                            value={formData.startDate || new Date()}
                            onChange={(value) => handleDateChange('startDate', value)}
                            renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                        />

                        <DatePicker
                            label="Due Date"
                            value={formData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
                            onChange={(value) => handleDateChange('dueDate', value)}
                            renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                        />
                    </LocalizationProvider>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    {task ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaskForm;