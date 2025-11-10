import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const ConfirmDialog = ({
    open,
    title = 'Confirm Action',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'primary',
}) => {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: 4,
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                <Box
                    sx={{
                        p: 1,
                        borderRadius: 2,
                        backgroundColor: `${confirmColor}.light`,
                        color: `${confirmColor}.contrastText`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <WarningAmberIcon />
                </Box>
                {title}
            </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 3 }}>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions
                sx={{
                    px: 3,
                    pb: 3,
                    gap: 1.5,
                }}
            >
                <Button
                    onClick={onCancel}
                    variant="outlined"
                    size="large"
                    sx={{ minWidth: 100 }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color={confirmColor}
                    size="large"
                    sx={{ minWidth: 100 }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
