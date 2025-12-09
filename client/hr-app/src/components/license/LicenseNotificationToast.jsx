import React, { useEffect } from 'react';
import { useLicense } from '../../context/LicenseContext';
import { Alert, Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

/**
 * LicenseNotificationToast Component
 * Displays real-time license notifications as toast messages
 */
const LicenseNotificationToast = () => {
    const { notifications, removeNotification } = useLicense();
    const [currentNotification, setCurrentNotification] = React.useState(null);
    const [queue, setQueue] = React.useState([]);

    // Manage notification queue
    useEffect(() => {
        if (notifications.length > 0 && !currentNotification) {
            // Show the first notification in the queue
            const next = notifications[0];
            setCurrentNotification(next);
            setQueue(notifications.slice(1));
        } else if (notifications.length > queue.length + (currentNotification ? 1 : 0)) {
            // New notifications added, update queue
            const newNotifications = notifications.slice(currentNotification ? 1 : 0);
            setQueue(newNotifications);
        }
    }, [notifications, currentNotification, queue.length]);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        if (currentNotification) {
            removeNotification(currentNotification.id);
            setCurrentNotification(null);
        }
    };

    const handleExited = () => {
        // Show next notification in queue
        if (queue.length > 0) {
            setCurrentNotification(queue[0]);
            setQueue(queue.slice(1));
        }
    };

    if (!currentNotification) {
        return null;
    }

    const getSeverity = () => {
        switch (currentNotification.severity) {
            case 'critical':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'info';
        }
    };

    const getIcon = () => {
        switch (currentNotification.severity) {
            case 'critical':
                return <ErrorIcon />;
            case 'warning':
                return <WarningIcon />;
            case 'info':
                return <InfoIcon />;
            default:
                return <InfoIcon />;
        }
    };

    const getAutoHideDuration = () => {
        // Critical notifications stay longer
        if (currentNotification.severity === 'critical') {
            return 10000; // 10 seconds
        }
        return 6000; // 6 seconds
    };

    return (
        <Snackbar
            open={true}
            autoHideDuration={getAutoHideDuration()}
            onClose={handleClose}
            TransitionProps={{ onExited: handleExited }}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Alert
                severity={getSeverity()}
                icon={getIcon()}
                action={
                    <IconButton
                        size="small"
                        aria-label="close"
                        color="inherit"
                        onClick={handleClose}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
                sx={{
                    width: '100%',
                    minWidth: '300px',
                    maxWidth: '500px'
                }}
            >
                {currentNotification.message}
            </Alert>
        </Snackbar>
    );
};

export default LicenseNotificationToast;
