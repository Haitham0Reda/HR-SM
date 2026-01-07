import React from 'react';
import { Alert, AlertTitle, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ErrorAlert = ({ 
    message, 
    title = 'Error', 
    onClose, 
    severity = 'error',
    sx = {},
    ...props 
}) => {
    return (
        <Alert
            severity={severity}
            action={
                onClose && (
                    <IconButton
                        aria-label="close"
                        color="inherit"
                        size="small"
                        onClick={onClose}
                    >
                        <CloseIcon fontSize="inherit" />
                    </IconButton>
                )
            }
            sx={sx}
            {...props}
        >
            {title && <AlertTitle>{title}</AlertTitle>}
            {message}
        </Alert>
    );
};

export default ErrorAlert;