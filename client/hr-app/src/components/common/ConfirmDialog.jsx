import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
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
    loading = false,
}) => {
    const getColorScheme = () => {
        switch (confirmColor) {
            case 'error':
                return {
                    iconBg: '#ffebee',
                    iconColor: '#d32f2f',
                    buttonBg: '#d32f2f',
                    buttonHover: '#c62828'
                };
            case 'warning':
                return {
                    iconBg: '#fff3e0',
                    iconColor: '#f57c00',
                    buttonBg: '#f57c00',
                    buttonHover: '#ef6c00'
                };
            default:
                return {
                    iconBg: '#e3f2fd',
                    iconColor: '#1976d2',
                    buttonBg: '#1976d2',
                    buttonHover: '#1565c0'
                };
        }
    };

    const colors = getColorScheme();

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    overflow: 'visible'
                },
            }}
        >
            <Box sx={{
                position: 'relative',
                pt: 5,
                pb: 2
            }}>
                {/* Icon Circle */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -32,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: colors.iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: '4px solid white'
                    }}
                >
                    <WarningAmberIcon
                        sx={{
                            fontSize: 32,
                            color: colors.iconColor
                        }}
                    />
                </Box>

                <DialogTitle
                    sx={{
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        pb: 1,
                        pt: 2,
                        textAlign: 'center',
                        color: '#2c3e50'
                    }}
                >
                    {title}
                </DialogTitle>

                <DialogContent sx={{ pt: 2, pb: 3, px: 4 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            lineHeight: 1.7,
                            textAlign: 'center',
                            color: '#7f8c8d',
                            fontSize: '1rem'
                        }}
                    >
                        {message}
                    </Typography>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 4,
                        pb: 3,
                        gap: 2,
                        justifyContent: 'center'
                    }}
                >
                    {cancelText && (
                        <Button
                            onClick={onCancel}
                            variant="outlined"
                            size="large"
                            disabled={loading}
                            sx={{
                                minWidth: 120,
                                borderColor: '#d1d8e0',
                                color: '#7f8c8d',
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': {
                                    borderColor: '#95a5a6',
                                    bgcolor: 'rgba(127, 140, 141, 0.05)'
                                }
                            }}
                        >
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        size="large"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{
                            minWidth: 120,
                            bgcolor: colors.buttonBg,
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            '&:hover': {
                                bgcolor: colors.buttonHover,
                                boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
                            },
                            '&.Mui-disabled': {
                                bgcolor: colors.buttonBg,
                                opacity: 0.7,
                                color: 'white'
                            }
                        }}
                    >
                        {confirmText}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
};

export default ConfirmDialog;
