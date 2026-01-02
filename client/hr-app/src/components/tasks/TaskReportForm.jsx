import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Alert,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import {
    AttachFile,
    Delete
} from '@mui/icons-material';
import { taskService } from '../../services/task.service';

const TaskReportForm = ({ open, onClose, onSubmit, task }) => {
    const [reportData, setReportData] = useState({
        reportText: '',
        timeSpent: ''
    });

    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setReportData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files);

        if (selectedFiles.length === 0) return;

        // Validate file types and sizes
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        for (const file of selectedFiles) {
            if (file.size > maxSize) {
                setError(`File ${file.name} is too large. Maximum size is 5MB.`);
                return;
            }

            if (!allowedTypes.includes(file.type)) {
                setError(`File type not allowed for ${file.name}.`);
                return;
            }
        }

        // Add files to state
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadFile = async (file) => {
        try {
            setUploading(true);
            await taskService.uploadReportFile(task._id, file);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            // Validation
            if (!reportData.reportText.trim()) {
                setError('Report description is required');
                return;
            }

            setSubmitting(true);

            // Submit the report
            await onSubmit({
                reportText: reportData.reportText,
                timeSpent: reportData.timeSpent ? parseInt(reportData.timeSpent) : undefined
            });

            // Upload files if any
            if (files.length > 0) {
                for (const file of files) {
                    await handleUploadFile(file);
                }
            }

            // Close the form
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Submit Task Report
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                <Typography variant="subtitle1" gutterBottom>
                    Task: {task?.title}
                </Typography>

                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="reportText"
                    label="Report Description"
                    name="reportText"
                    value={reportData.reportText}
                    onChange={handleInputChange}
                    multiline
                    rows={4}
                    helperText="Describe the work you've completed for this task"
                />

                <TextField
                    margin="normal"
                    fullWidth
                    id="timeSpent"
                    label="Time Spent (minutes)"
                    name="timeSpent"
                    type="number"
                    value={reportData.timeSpent}
                    onChange={handleInputChange}
                    helperText="Approximate time spent working on this task"
                />

                <Box sx={{ mt: 2 }}>
                    <input
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx,.xls,.xlsx"
                        style={{ display: 'none' }}
                        id="task-report-file-upload"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        disabled={uploading}
                    />

                    <label htmlFor="task-report-file-upload">
                        <Button
                            variant="outlined"
                            component="span"
                            startIcon={<AttachFile />}
                            disabled={uploading}
                        >
                            Attach Files
                        </Button>
                    </label>

                    {uploading && (
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                            Uploading files...
                        </Typography>
                    )}
                </Box>

                {files.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Attached Files:
                        </Typography>
                        <List dense>
                            {files.map((file, index) => (
                                <ListItem key={index} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={file.name}
                                        secondary={`${(file.size / 1024).toFixed(2)} KB`}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            onClick={() => removeFile(index)}
                                            disabled={uploading}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={submitting || uploading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={submitting || uploading}
                >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaskReportForm;