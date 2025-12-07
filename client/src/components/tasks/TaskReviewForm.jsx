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
    FormControl,
    FormControlLabel,
    RadioGroup,
    Radio,
    FormLabel,
    Card,
    CardContent,
    Chip
} from '@mui/material';

const TaskReviewForm = ({ open, onClose, onSubmit, task, report }) => {
    const [reviewData, setReviewData] = useState({
        status: 'approved',
        reviewComments: ''
    });

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setReviewData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        try {
            // Validation
            if (!reviewData.status) {
                setError('Please select a review decision');
                return;
            }

            setSubmitting(true);

            // Submit the review
            await onSubmit({
                status: reviewData.status,
                reviewComments: reviewData.reviewComments
            });

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
                Review Task Report
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

                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Report Details
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Report Text:
                            </Typography>
                            <Typography variant="body2" paragraph>
                                {report?.reportText}
                            </Typography>
                        </Box>

                        {report?.timeSpent && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2">
                                    Time Spent: {report.timeSpent} minutes
                                </Typography>
                            </Box>
                        )}

                        {report?.files && report.files.length > 0 && (
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Attached Files:
                                </Typography>
                                {report.files.map((file, index) => (
                                    <Chip
                                        key={index}
                                        label={file.originalName}
                                        size="small"
                                        sx={{ mr: 1, mb: 1 }}
                                    />
                                ))}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
                    <FormLabel component="legend">Review Decision</FormLabel>
                    <RadioGroup
                        aria-label="review-decision"
                        name="status"
                        value={reviewData.status}
                        onChange={handleInputChange}
                    >
                        <FormControlLabel
                            value="approved"
                            control={<Radio />}
                            label="Approve Task Completion"
                        />
                        <FormControlLabel
                            value="rejected"
                            control={<Radio />}
                            label="Reject and Request Rework"
                        />
                    </RadioGroup>
                </FormControl>

                <TextField
                    margin="normal"
                    fullWidth
                    id="reviewComments"
                    label="Review Comments"
                    name="reviewComments"
                    value={reviewData.reviewComments}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                    helperText="Provide feedback to the employee"
                />
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={submitting}
                >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaskReviewForm;