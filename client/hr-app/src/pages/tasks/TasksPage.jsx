import { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Tabs,
    Tab,
    Box,
    Button,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    useTheme
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../services/task.service';
import TaskList from '../../components/tasks/TaskList';
import TaskForm from '../../components/tasks/TaskForm';
import TaskReportForm from '../../components/tasks/TaskReportForm';
import ModuleNotAvailable from '../../components/common/ModuleNotAvailable';

const TasksPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openTaskForm, setOpenTaskForm] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [openReportForm, setOpenReportForm] = useState(false);
    const [moduleNotAvailable, setModuleNotAvailable] = useState(false);
    const { user } = useAuth();
    const theme = useTheme();

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getUserTasks();
            setTasks(data);
            setError('');
        } catch (err) {
            // Handle module not enabled error gracefully
            if (err.message && err.message.includes('not enabled')) {
                setModuleNotAvailable(true);
                setError('');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch tasks if user is authenticated
        if (user) {
            fetchTasks();
        }
    }, [user]);

    const handleTabChange = (_, newValue) => {
        setActiveTab(newValue);
    };

    const handleCreateTask = () => {
        setSelectedTask(null);
        setOpenTaskForm(true);
    };

    const handleEditTask = (task) => {
        setSelectedTask(task);
        setOpenTaskForm(true);
    };

    const handleTaskSubmit = async (taskData) => {
        try {
            if (selectedTask) {
                // Update existing task
                await taskService.updateTask(selectedTask._id, taskData);
            } else {
                // Create new task
                await taskService.createTask(taskData);
            }
            setOpenTaskForm(false);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await taskService.deleteTask(taskId);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReportTask = (task) => {
        setSelectedTask(task);
        setOpenReportForm(true);
    };

    const handleReportSubmit = async (reportData) => {
        try {
            await taskService.upsertTaskReport(selectedTask._id, reportData);
            setOpenReportForm(false);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await taskService.updateTaskStatus(taskId, newStatus);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (activeTab === 0) return true; // All tasks
        if (activeTab === 1) return task.assignedTo?._id === user._id; // Assigned to me
        if (activeTab === 2) return task.assignedBy?._id === user._id; // Assigned by me
        return true;
    });

    const getStatusFilteredTasks = (status) => {
        return filteredTasks.filter(task => task.status === status);
    };

    if (loading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (moduleNotAvailable) {
        return <ModuleNotAvailable moduleName="Tasks module" />;
    }

    return (
        <Container 
            maxWidth="xl" 
            sx={{ 
                mt: theme.spacing(4), 
                mb: theme.spacing(4),
                px: { xs: theme.spacing(2), sm: theme.spacing(3) }
            }}
        >
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: theme.spacing(4),
                p: theme.spacing(3),
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius / 6,
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`
            }}>
                <Box>
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: theme.typography.fontWeightBold, 
                            color: theme.palette.primary.main, 
                            mb: theme.spacing(1) 
                        }}
                    >
                        Task Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage and track your team's tasks efficiently
                    </Typography>
                </Box>
                {['manager', 'hr', 'admin'].includes(user.role) && (
                    <Button 
                        variant="contained" 
                        onClick={handleCreateTask}
                        sx={{ 
                            px: theme.spacing(3), 
                            py: theme.spacing(1.5),
                            borderRadius: theme.shape.borderRadius / 6,
                            textTransform: 'none',
                            fontWeight: theme.typography.fontWeightBold,
                            boxShadow: theme.shadows[2],
                            '&:hover': {
                                boxShadow: theme.shadows[4]
                            }
                        }}
                    >
                        + Create Task
                    </Button>
                )}
            </Box>

            {/* Task Statistics */}
            {!loading && !moduleNotAvailable && (
                <Box sx={{ 
                    display: 'flex', 
                    gap: theme.spacing(2), 
                    mb: theme.spacing(3),
                    flexWrap: 'wrap'
                }}>
                    <Paper sx={{ 
                        p: theme.spacing(2.5), 
                        minWidth: 140, 
                        textAlign: 'center',
                        borderRadius: theme.shape.borderRadius / 6,
                        border: `1px solid ${theme.palette.divider}`,
                        transition: theme.transitions.create(['box-shadow', 'transform'], {
                            duration: theme.transitions.duration.short,
                        }),
                        '&:hover': {
                            boxShadow: theme.shadows[4],
                            transform: 'translateY(-2px)'
                        }
                    }}>
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                color: theme.palette.primary.main, 
                                fontWeight: theme.typography.fontWeightBold,
                                mb: theme.spacing(0.5)
                            }}
                        >
                            {filteredTasks.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Tasks
                        </Typography>
                    </Paper>
                    <Paper sx={{ 
                        p: theme.spacing(2.5), 
                        minWidth: 140, 
                        textAlign: 'center',
                        borderRadius: theme.shape.borderRadius / 6,
                        border: `1px solid ${theme.palette.divider}`,
                        transition: theme.transitions.create(['box-shadow', 'transform'], {
                            duration: theme.transitions.duration.short,
                        }),
                        '&:hover': {
                            boxShadow: theme.shadows[4],
                            transform: 'translateY(-2px)'
                        }
                    }}>
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                color: theme.palette.warning.main, 
                                fontWeight: theme.typography.fontWeightBold,
                                mb: theme.spacing(0.5)
                            }}
                        >
                            {getStatusFilteredTasks('in-progress').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            In Progress
                        </Typography>
                    </Paper>
                    <Paper sx={{ 
                        p: theme.spacing(2.5), 
                        minWidth: 140, 
                        textAlign: 'center',
                        borderRadius: theme.shape.borderRadius / 6,
                        border: `1px solid ${theme.palette.divider}`,
                        transition: theme.transitions.create(['box-shadow', 'transform'], {
                            duration: theme.transitions.duration.short,
                        }),
                        '&:hover': {
                            boxShadow: theme.shadows[4],
                            transform: 'translateY(-2px)'
                        }
                    }}>
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                color: theme.palette.success.main, 
                                fontWeight: theme.typography.fontWeightBold,
                                mb: theme.spacing(0.5)
                            }}
                        >
                            {getStatusFilteredTasks('completed').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Completed
                        </Typography>
                    </Paper>
                    <Paper sx={{ 
                        p: theme.spacing(2.5), 
                        minWidth: 140, 
                        textAlign: 'center',
                        borderRadius: theme.shape.borderRadius / 6,
                        border: `1px solid ${theme.palette.divider}`,
                        transition: theme.transitions.create(['box-shadow', 'transform'], {
                            duration: theme.transitions.duration.short,
                        }),
                        '&:hover': {
                            boxShadow: theme.shadows[4],
                            transform: 'translateY(-2px)'
                        }
                    }}>
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                color: theme.palette.error.main, 
                                fontWeight: theme.typography.fontWeightBold,
                                mb: theme.spacing(0.5)
                            }}
                        >
                            {filteredTasks.filter(task => new Date(task.dueDate) < new Date() && !['completed', 'rejected'].includes(task.status)).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Overdue
                        </Typography>
                    </Paper>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box sx={{ 
                backgroundColor: theme.palette.background.paper, 
                borderRadius: theme.shape.borderRadius / 6, 
                mb: theme.spacing(3),
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden'
            }}>
                <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange} 
                    sx={{ 
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: theme.typography.fontWeightBold,
                            fontSize: '0.95rem',
                            color: theme.palette.text.secondary,
                            transition: theme.transitions.create(['color', 'background-color'], {
                                duration: theme.transitions.duration.short,
                            }),
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                                color: theme.palette.text.primary
                            },
                            '&.Mui-selected': {
                                color: theme.palette.primary.main,
                                fontWeight: theme.typography.fontWeightBold
                            }
                        },
                        '& .MuiTabs-indicator': {
                            height: 3,
                            borderRadius: '3px 3px 0 0',
                            backgroundColor: theme.palette.primary.main
                        },
                        '& .MuiTabs-flexContainer': {
                            borderBottom: `1px solid ${theme.palette.divider}`
                        }
                    }}
                >
                    <Tab label="All Tasks" />
                    <Tab label="Assigned to Me" />
                    <Tab label="Assigned by Me" />
                </Tabs>
            </Box>

            {['manager', 'hr', 'admin'].includes(user.role) && openTaskForm && (
                <TaskForm
                    open={openTaskForm}
                    onClose={() => setOpenTaskForm(false)}
                    onSubmit={handleTaskSubmit}
                    task={selectedTask}
                />
            )}

            {openReportForm && (
                <TaskReportForm
                    open={openReportForm}
                    onClose={() => setOpenReportForm(false)}
                    onSubmit={handleReportSubmit}
                    task={selectedTask}
                />
            )}

            <Grid 
                container 
                spacing={theme.spacing(3)} 
                sx={{ 
                    minHeight: '500px',
                    mt: theme.spacing(1)
                }}
            >
                <Grid xs={12} md={8} lg={4}>
                    <TaskList
                        title="Assigned"
                        tasks={getStatusFilteredTasks('assigned')}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        onStatusChange={handleStatusChange}
                        user={user}
                    />
                </Grid>
                <Grid xs={12} md={4} lg={2.67}>
                    <TaskList
                        title="In Progress"
                        tasks={getStatusFilteredTasks('in-progress')}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        onStatusChange={handleStatusChange}
                        user={user}
                    />
                </Grid>
                <Grid xs={12} md={6} lg={2.67}>
                    <TaskList
                        title="Submitted"
                        tasks={getStatusFilteredTasks('submitted')}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        onStatusChange={handleStatusChange}
                        user={user}
                    />
                </Grid>
                <Grid xs={12} md={6} lg={2.67}>
                    <TaskList
                        title="Completed/Rejected"
                        tasks={[
                            ...getStatusFilteredTasks('completed'),
                            ...getStatusFilteredTasks('rejected')
                        ]}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        onStatusChange={handleStatusChange}
                        user={user}
                    />
                </Grid>
            </Grid>
        </Container>
    );
};

export default TasksPage;