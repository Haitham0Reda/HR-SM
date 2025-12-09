import React from 'react';
import {
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Chip,
    Box,
    Tooltip
} from '@mui/material';
import {
    Edit,
    Delete,
    Assignment,
    PlayArrow,
    Send,
    CheckCircle,
    Cancel
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const TaskList = ({ title, tasks, onEdit, onDelete, onReport, user }) => {
    const navigate = useNavigate();

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

    const canEditTask = (task) => {
        return task.assigner._id === user._id || user.role === 'admin';
    };

    const canDeleteTask = (task) => {
        return task.assigner._id === user._id || user.role === 'admin';
    };

    const canReportTask = (task) => {
        return task.assignee._id === user._id &&
            (task.status === 'in-progress' || task.status === 'rejected');
    };

    const getActionIcon = (task) => {
        if (task.assignee._id === user._id) {
            if (task.status === 'assigned') {
                return <PlayArrow />;
            } else if (task.status === 'in-progress') {
                return <Send />;
            } else if (task.status === 'rejected') {
                return <PlayArrow />;
            }
        }
        return <Assignment />;
    };

    const getActionTooltip = (task) => {
        if (task.assignee._id === user._id) {
            if (task.status === 'assigned') {
                return 'Start Task';
            } else if (task.status === 'in-progress') {
                return 'Submit Report';
            } else if (task.status === 'rejected') {
                return 'Re-work Task';
            }
        }
        return 'View Task';
    };

    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
                {title} ({tasks.length})
            </Typography>

            <List dense>
                {tasks.map((task) => (
                    <ListItem
                        key={task._id}
                        divider={tasks.indexOf(task) < tasks.length - 1}
                        sx={{ pl: 0, pr: 0 }}
                    >
                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1 }}>
                                        {task.title}
                                    </Typography>
                                    <Chip
                                        label={task.status}
                                        color={getStatusColor(task.status)}
                                        size="small"
                                        sx={{ height: 18, fontSize: '0.7rem' }}
                                    />
                                </Box>
                            }
                            secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>
                                        •
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {task.assignee.personalInfo?.fullName || task.assignee.username}
                                    </Typography>
                                </Box>
                            }
                        />

                        <ListItemSecondaryAction>
                            <Tooltip title={getActionTooltip(task)}>
                                <IconButton
                                    edge="end"
                                    aria-label="action"
                                    onClick={() => {
                                        if (task.assignee._id === user._id) {
                                            if (task.status === 'assigned') {
                                                // Start task
                                                // This would require an API call to update status
                                                console.log('Start task', task._id);
                                            } else if (task.status === 'in-progress') {
                                                onReport(task);
                                            } else if (task.status === 'rejected') {
                                                // Re-work task
                                                // This would require an API call to update status
                                                console.log('Re-work task', task._id);
                                            } else {
                                                navigate(`/app/tasks/${task._id}`);
                                            }
                                        } else {
                                            navigate(`/app/tasks/${task._id}`);
                                        }
                                    }}
                                >
                                    {getActionIcon(task)}
                                </IconButton>
                            </Tooltip>

                            {canEditTask(task) && (
                                <Tooltip title="Edit">
                                    <IconButton
                                        edge="end"
                                        aria-label="edit"
                                        onClick={() => onEdit(task)}
                                        sx={{ ml: 0.5 }}
                                    >
                                        <Edit />
                                    </IconButton>
                                </Tooltip>
                            )}

                            {canDeleteTask(task) && (
                                <Tooltip title="Delete">
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => onDelete(task._id)}
                                        sx={{ ml: 0.5 }}
                                    >
                                        <Delete />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}

                {tasks.length === 0 && (
                    <ListItem>
                        <ListItemText
                            primary={
                                <Typography variant="body2" color="text.secondary" align="center">
                                    No tasks found
                                </Typography>
                            }
                        />
                    </ListItem>
                )}
            </List>
        </Paper>
    );
};

export default TaskList;