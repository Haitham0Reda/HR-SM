import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Box,
    Button,
    Chip,
    Divider,
    CircularProgress,
    Alert,
    Grid,
    Card,
    CardContent,
    CardHeader
} from '@mui/material';
import {
    Assignment,
    Person,
    CalendarToday,
    PriorityHigh,
    Schedule,
    CheckCircle,
    Cancel
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../services/task.service';
import TaskReportForm from '../../components/tasks/TaskReportForm';
import TaskReviewForm from '../../components/tasks/TaskReviewForm';

const TaskDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { user } = useAuth();
    const [task, setTask] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openReportForm, setOpenReportForm] = useState(false);
    const [openReviewForm, setOpenReviewForm] = useState(false);

    const fetchTaskDetails = async () => {
        try {
            setLoading(true);
            const taskData = await taskService.getTaskById(id);
            const reportsData = await taskService.getTaskReports(id);
            setTask(taskData);
            setReports(reportsData);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetails();
    }, [id]);

    const handleStatusChange = async (newStatus) => {
        try {
            await taskService.updateTaskStatus(id, newStatus);
            fetchTaskDetails();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReportSubmit = async (reportData) => {
        try {
            await taskService.upsertTaskReport(id, reportData);
            setOpenReportForm(false);
            fetchTaskDetails();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReviewSubmit = async (reviewData) => {
        try {
            await taskService.reviewTaskReport(id, reviewData);
            setOpenReviewForm(false);
            fetchTaskDetails();
        } catch (err) {
            setError(err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'assigned': return 'info';
            case 'in-progress': return 'warning';
            case 'submitted': return 'secondary';
            case 'reviewed': return 'primary';
            case 'completed': return 'success';
            case 'rejected': return 'error';
            default: return 'default';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'low': return 'success';
            case 'medium': return 'info';
            case 'high': return 'warning';
            case 'urgent': return 'error';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    if (!task) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="warning">Task not found</Alert>
            </Container>
        );
    }

    const isAssignee = task.assignedTo?._id === user._id;
    const isAssigner = task.assignedBy?._id === user._id;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Task Details</Typography>
                <Button variant="outlined" onClick={() => navigate(getCompanyRoute('/tasks'))}>
                    Back to Tasks
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="h5">{task.title}</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                            <Chip
                                label={task.status}
                                color={getStatusColor(task.status)}
                                size="small"
                            />
                            <Chip
                                label={task.priority}
                                color={getPriorityColor(task.priority)}
                                size="small"
                            />
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="body1" sx={{ mb: 3 }}>
                            {task.description}
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Person sx={{ mr: 1, fontSize: 'small' }} />
                                    <Typography variant="subtitle2">Assignee:</Typography>
                                </Box>
                                <Typography variant="body2">
                                    {task.assignedTo?.personalInfo?.fullName || 
                                     `${task.assignedTo?.personalInfo?.firstName || ''} ${task.assignedTo?.personalInfo?.lastName || ''}`.trim() ||
                                     task.assignedTo?.username || 'Unknown User'}
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Person sx={{ mr: 1, fontSize: 'small' }} />
                                    <Typography variant="subtitle2">Assigner:</Typography>
                                </Box>
                                <Typography variant="body2">
                                    {task.assignedBy?.personalInfo?.fullName || 
                                     `${task.assignedBy?.personalInfo?.firstName || ''} ${task.assignedBy?.personalInfo?.lastName || ''}`.trim() ||
                                     task.assignedBy?.username || 'Unknown User'}
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <CalendarToday sx={{ mr: 1, fontSize: 'small' }} />
                                    <Typography variant="subtitle2">Start Date:</Typography>
                                </Box>
                                <Typography variant="body2">
                                    {new Date(task.startDate).toLocaleDateString()}
                                </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Schedule sx={{ mr: 1, fontSize: 'small' }} />
                                    <Typography variant="subtitle2">Due Date:</Typography>
                                </Box>
                                <Typography variant="body2">
                                    {new Date(task.dueDate).toLocaleDateString()}
                                </Typography>
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {isAssignee && task.status === 'assigned' && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleStatusChange('in-progress')}
                                >
                                    Start Task
                                </Button>
                            )}

                            {isAssignee && task.status === 'in-progress' && (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenReportForm(true)}
                                >
                                    Submit Report
                                </Button>
                            )}

                            {isAssignee && task.status === 'rejected' && (
                                <Button
                                    variant="contained"
                                    color="warning"
                                    onClick={() => handleStatusChange('in-progress')}
                                >
                                    Re-work Task
                                </Button>
                            )}

                            {isAssigner && task.status === 'submitted' && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setOpenReviewForm(true)}
                                >
                                    Review Report
                                </Button>
                            )}
                        </Box>
                    </Paper>

                    {reports.length > 0 && (
                        <Paper sx={{ p: 3, mt: 3 }}>
                            <Typography variant="h6" gutterBottom>Reports</Typography>
                            {reports.map(report => (
                                <Card key={report._id} sx={{ mb: 2 }}>
                                    <CardHeader
                                        title={`Report ${report.status}`}
                                        subheader={new Date(report.createdAt).toLocaleString()}
                                    />
                                    <CardContent>
                                        <Typography variant="body2" paragraph>
                                            {report.reportText}
                                        </Typography>
                                        {report.timeSpent && (
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                <strong>Time Spent:</strong> {report.timeSpent} minutes
                                            </Typography>
                                        )}
                                        {report.reviewComments && (
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                <strong>Review Comments:</strong> {report.reviewComments}
                                            </Typography>
                                        )}
                                        {report.reviewedBy && (
                                            <Typography variant="body2">
                                                <strong>Reviewed by:</strong> {report.reviewedBy.personalInfo?.fullName || report.reviewedBy.username}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Paper>
                    )}
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Task Actions</Typography>

                        {isAssignee && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>Your Role: Assignee</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    As the assignee, you are responsible for completing this task and submitting reports.
                                </Typography>
                            </Box>
                        )}

                        {isAssigner && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>Your Role: Assigner</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    As the assigner, you are responsible for reviewing submitted reports and approving completion.
                                </Typography>
                            </Box>
                        )}

                        {!isAssignee && !isAssigner && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>Your Role: Observer</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    You can view this task but cannot make changes.
                                </Typography>
                            </Box>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="h6" gutterBottom>Status Legend</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip label="Assigned" color="info" size="small" sx={{ mr: 1 }} />
                                <Typography variant="body2">Task has been assigned but not started</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip label="In Progress" color="warning" size="small" sx={{ mr: 1 }} />
                                <Typography variant="body2">Task is being worked on</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Chip label="Submitted" color="secondary" size="small" sx={{ mr: 1 }} />
                                <Typography variant="body2">Report has been submitted for review</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CheckCircle sx={{ mr: 1, color: 'success.main', fontSize: 'small' }} />
                                <Typography variant="body2">Task completed successfully</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Cancel sx={{ mr: 1, color: 'error.main', fontSize: 'small' }} />
                                <Typography variant="body2">Task rejected, needs rework</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {openReportForm && (
                <TaskReportForm
                    open={openReportForm}
                    onClose={() => setOpenReportForm(false)}
                    onSubmit={handleReportSubmit}
                    task={task}
                />
            )}

            {openReviewForm && (
                <TaskReviewForm
                    open={openReviewForm}
                    onClose={() => setOpenReviewForm(false)}
                    onSubmit={handleReviewSubmit}
                    task={task}
                    report={reports[0]}
                />
            )}
        </Container>
    );
};

export default TaskDetailsPage;