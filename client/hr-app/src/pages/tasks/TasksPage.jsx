import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Tabs,
    Tab,
    Box,
    Button,
    CircularProgress,
    Alert,
    Grid
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../services/task.service';
import TaskList from '../../components/tasks/TaskList';
import TaskForm from '../../components/tasks/TaskForm';
import TaskReportForm from '../../components/tasks/TaskReportForm';

const TasksPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openTaskForm, setOpenTaskForm] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [openReportForm, setOpenReportForm] = useState(false);
    const { user } = useAuth();

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await taskService.getUserTasks();
            setTasks(data);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleTabChange = (event, newValue) => {
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

    const filteredTasks = tasks.filter(task => {
        if (activeTab === 0) return true; // All tasks
        if (activeTab === 1) return task.assignee._id === user._id; // Assigned to me
        if (activeTab === 2) return task.assigner._id === user._id; // Assigned by me
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

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Task Management</Typography>
                {['manager', 'hr', 'admin'].includes(user.role) && (
                    <Button variant="contained" onClick={handleCreateTask}>
                        Create Task
                    </Button>
                )}
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
                <Tab label="All Tasks" />
                <Tab label="Assigned to Me" />
                <Tab label="Assigned by Me" />
            </Tabs>

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

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <TaskList
                        title="Assigned"
                        tasks={getStatusFilteredTasks('assigned')}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        user={user}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <TaskList
                        title="In Progress"
                        tasks={getStatusFilteredTasks('in-progress')}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        user={user}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <TaskList
                        title="Submitted"
                        tasks={getStatusFilteredTasks('submitted')}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        user={user}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                    <TaskList
                        title="Completed/Rejected"
                        tasks={[
                            ...getStatusFilteredTasks('completed'),
                            ...getStatusFilteredTasks('rejected')
                        ]}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onReport={handleReportTask}
                        user={user}
                    />
                </Grid>
            </Grid>
        </Container>
    );
};

export default TasksPage;