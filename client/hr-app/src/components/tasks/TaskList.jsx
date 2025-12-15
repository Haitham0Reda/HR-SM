import {
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Chip,
    Box,
    Tooltip,
    Skeleton,
    useTheme
} from '@mui/material';
import {
    Edit,
    Delete,
    Assignment,
    PlayArrow,
    Send
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';

const TaskList = ({ title, tasks, onEdit, onDelete, onReport, onStatusChange, user, loading = false }) => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const theme = useTheme();

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
            case 'low': return '#4caf50';
            case 'medium': return '#ff9800';
            case 'high': return '#f44336';
            case 'urgent': return '#d32f2f';
            default: return '#9e9e9e';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'low': return '🟢';
            case 'medium': return '🟡';
            case 'high': return '🟠';
            case 'urgent': return '🔴';
            default: return '⚪';
        }
    };

    const getCategoryTheme = (title, theme) => {
        switch (title.toLowerCase()) {
            case 'assigned':
                return {
                    headerColor: theme.palette.info.main,
                    headerBg: `linear-gradient(135deg, ${theme.palette.info.light}20 0%, ${theme.palette.info.light}40 100%)`,
                    borderColor: theme.palette.info.main,
                    icon: '📋',
                    chipColor: theme.palette.info.main
                };
            case 'in progress':
                return {
                    headerColor: theme.palette.warning.main,
                    headerBg: `linear-gradient(135deg, ${theme.palette.warning.light}20 0%, ${theme.palette.warning.light}40 100%)`,
                    borderColor: theme.palette.warning.main,
                    icon: '⚡',
                    chipColor: theme.palette.warning.main
                };
            case 'submitted':
                return {
                    headerColor: theme.palette.secondary.main,
                    headerBg: `linear-gradient(135deg, ${theme.palette.secondary.light}20 0%, ${theme.palette.secondary.light}40 100%)`,
                    borderColor: theme.palette.secondary.main,
                    icon: '📤',
                    chipColor: theme.palette.secondary.main
                };
            case 'completed/rejected':
                return {
                    headerColor: theme.palette.success.main,
                    headerBg: `linear-gradient(135deg, ${theme.palette.success.light}20 0%, ${theme.palette.success.light}40 100%)`,
                    borderColor: theme.palette.success.main,
                    icon: '✅',
                    chipColor: theme.palette.success.main
                };
            default:
                return {
                    headerColor: theme.palette.text.secondary,
                    headerBg: `linear-gradient(135deg, ${theme.palette.grey[100]} 0%, ${theme.palette.grey[200]} 100%)`,
                    borderColor: theme.palette.divider,
                    icon: '📁',
                    chipColor: theme.palette.text.secondary
                };
        }
    };

    const canEditTask = (task) => {
        return task.assignedBy?._id === user._id || user.role === 'admin';
    };

    const canDeleteTask = (task) => {
        return task.assignedBy?._id === user._id || user.role === 'admin';
    };



    const getActionIcon = (task) => {
        if (task.assignedTo?._id === user._id) {
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
        if (task.assignedTo?._id === user._id) {
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

    const categoryTheme = getCategoryTheme(title, theme);

    return (
        <Paper 
            elevation={2}
            sx={{ 
                height: '100%',
                borderRadius: theme.shape.borderRadius / 6,
                border: `1px solid ${categoryTheme.borderColor}`,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: theme.palette.background.paper,
                transition: theme.transitions.create(['box-shadow', 'transform', 'border-color'], {
                    duration: theme.transitions.duration.standard,
                }),
                '&:hover': {
                    boxShadow: theme.shadows[8],
                    transform: 'translateY(-4px)',
                    borderColor: categoryTheme.headerColor
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: `linear-gradient(90deg, ${categoryTheme.borderColor} 0%, ${categoryTheme.headerColor} 100%)`,
                    zIndex: 1
                }
            }}
        >
            {/* Category Header */}
            <Box 
                sx={{ 
                    background: categoryTheme.headerBg,
                    p: theme.spacing(2.5),
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 2
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                        sx={{ 
                            fontSize: '1.5rem',
                            lineHeight: 1
                        }}
                    >
                        {categoryTheme.icon}
                    </Typography>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 700,
                            color: categoryTheme.headerColor,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.95rem'
                        }}
                    >
                        {title}
                    </Typography>
                </Box>
                <Chip 
                    label={tasks.length} 
                    size="small" 
                    sx={{ 
                        fontWeight: theme.typography.fontWeightBold,
                        backgroundColor: categoryTheme.chipColor,
                        color: theme.palette.getContrastText(categoryTheme.chipColor),
                        minWidth: '32px',
                        height: '24px',
                        transition: theme.transitions.create(['transform', 'box-shadow'], {
                            duration: theme.transitions.duration.short,
                        }),
                        '& .MuiChip-label': {
                            fontSize: theme.typography.caption.fontSize,
                            fontWeight: theme.typography.fontWeightBold,
                            px: theme.spacing(1)
                        },
                        '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: theme.shadows[4]
                        }
                    }}
                />
            </Box>

            {/* Task List Container */}
            <Box sx={{ p: theme.spacing(2) }}>

                <List 
                    dense 
                    sx={{ 
                        maxHeight: '450px', 
                        overflow: 'auto',
                        p: 0,
                        '&::-webkit-scrollbar': {
                            display: 'none'
                        },
                        scrollbarWidth: 'none', // Firefox
                        msOverflowStyle: 'none' // IE and Edge
                    }}
                >
                {loading ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, index) => (
                        <ListItem key={index} sx={{ py: 1.5, display: 'flex', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1, mr: 2 }}>
                                <Skeleton variant="text" width="70%" height={20} />
                                <Box sx={{ mt: 1 }}>
                                    <Skeleton variant="text" width="50%" height={16} />
                                    <Skeleton variant="text" width="60%" height={16} />
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Skeleton variant="circular" width={32} height={32} />
                            </Box>
                        </ListItem>
                    ))
                ) : (
                    tasks.map((task) => (
                    <ListItem
                        key={task._id}
                        divider={tasks.indexOf(task) < tasks.length - 1}
                        sx={{ 
                            pl: 0, 
                            pr: 0,
                            py: theme.spacing(1.5),
                            mx: theme.spacing(1),
                            mb: theme.spacing(1.5),
                            borderRadius: theme.shape.borderRadius / 6,
                            borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                            backgroundColor: theme.palette.background.paper,
                            boxShadow: theme.shadows[1],
                            transition: theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
                                duration: theme.transitions.duration.short,
                            }),
                            '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                                cursor: 'pointer',
                                transform: 'translateX(4px)',
                                boxShadow: theme.shadows[4]
                            },
                            '&:last-child': {
                                mb: 0
                            },
                            display: 'flex',
                            alignItems: 'flex-start'
                        }}
                    >
                        <Box sx={{ flex: 1, mr: 2 }}>
                            {/* Primary Content */}
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontWeight: 600, 
                                        color: 'text.primary',
                                        flex: 1,
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title={task.title}
                                >
                                    {task.title}
                                </Typography>
                                <Chip
                                    label={task.status.replace('-', ' ')}
                                    color={getStatusColor(task.status)}
                                    size="small"
                                    sx={{ 
                                        height: 20, 
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        textTransform: 'capitalize',
                                        '& .MuiChip-label': {
                                            px: 1
                                        }
                                    }}
                                />
                            </Box>
                            
                            {/* Secondary Content */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: new Date(task.dueDate) < new Date() ? 'error.main' : 'text.secondary',
                                            fontWeight: new Date(task.dueDate) < new Date() ? 'bold' : 'normal'
                                        }}
                                    >
                                        📅 Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: getPriorityColor(task.priority),
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5
                                        }}
                                    >
                                        {getPriorityIcon(task.priority)} {task.priority?.toUpperCase()}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        👤 {task.assignedTo?.personalInfo?.fullName || task.assignedTo?.username || 'Unknown User'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start', mt: 0.5 }}>
                            <Tooltip title={getActionTooltip(task)}>
                                <IconButton
                                    size="small"
                                    aria-label="action"
                                    onClick={() => {
                                        if (task.assignedTo?._id === user._id) {
                                            if (task.status === 'assigned') {
                                                // Start task
                                                onStatusChange && onStatusChange(task._id, 'in-progress');
                                            } else if (task.status === 'in-progress') {
                                                onReport(task);
                                            } else if (task.status === 'rejected') {
                                                // Re-work task
                                                onStatusChange && onStatusChange(task._id, 'in-progress');
                                            } else {
                                                navigate(getCompanyRoute(`/tasks/${task._id}`));
                                            }
                                        } else {
                                            navigate(getCompanyRoute(`/tasks/${task._id}`));
                                        }
                                    }}
                                    sx={{
                                        backgroundColor: categoryTheme.borderColor,
                                        color: theme.palette.getContrastText(categoryTheme.borderColor),
                                        transition: theme.transitions.create(['opacity', 'transform'], {
                                            duration: theme.transitions.duration.short,
                                        }),
                                        '&:hover': {
                                            backgroundColor: categoryTheme.borderColor,
                                            opacity: 0.9,
                                            transform: 'scale(1.05)'
                                        }
                                    }}
                                >
                                    {getActionIcon(task)}
                                </IconButton>
                            </Tooltip>

                            {canEditTask(task) && (
                                <Tooltip title="Edit">
                                    <IconButton
                                        size="small"
                                        aria-label="edit"
                                        onClick={() => onEdit(task)}
                                        sx={{
                                            color: theme.palette.info.main,
                                            transition: theme.transitions.create(['background-color', 'color'], {
                                                duration: theme.transitions.duration.short,
                                            }),
                                            '&:hover': {
                                                backgroundColor: theme.palette.info.main,
                                                color: theme.palette.getContrastText(theme.palette.info.main)
                                            }
                                        }}
                                    >
                                        <Edit />
                                    </IconButton>
                                </Tooltip>
                            )}

                            {canDeleteTask(task) && (
                                <Tooltip title="Delete">
                                    <IconButton
                                        size="small"
                                        aria-label="delete"
                                        onClick={() => onDelete(task._id)}
                                        sx={{
                                            color: theme.palette.error.main,
                                            transition: theme.transitions.create(['background-color', 'color'], {
                                                duration: theme.transitions.duration.short,
                                            }),
                                            '&:hover': {
                                                backgroundColor: theme.palette.error.main,
                                                color: theme.palette.getContrastText(theme.palette.error.main)
                                            }
                                        }}
                                    >
                                        <Delete />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </ListItem>
                    ))
                )}

                {!loading && tasks.length === 0 && (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center',
                            py: theme.spacing(4),
                            textAlign: 'center'
                        }}
                    >
                        <Typography sx={{ fontSize: 48, mb: theme.spacing(2) }}>
                            {categoryTheme.icon}
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: theme.typography.fontWeightMedium, 
                                color: categoryTheme.headerColor, 
                                mb: theme.spacing(1) 
                            }}
                        >
                            No tasks in this category
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            Tasks will appear here when available
                        </Typography>
                    </Box>
                )}
                </List>
            </Box>
        </Paper>
    );
};

export default TaskList;