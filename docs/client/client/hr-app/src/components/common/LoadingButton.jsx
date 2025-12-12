/**
 * LoadingButton Component
 * 
 * Button with integrated loading state
 * Shows spinner while loading and disables interaction
 * 
 * Usage:
 * <LoadingButton loading={isSubmitting} onClick={handleSubmit}>
 *     Submit
 * </LoadingButton>
 */

import React from 'react';
import { Button, CircularProgress, Box } from '@mui/material';

const LoadingButton = ({
    children,
    loading = false,
    loadingText = null,
    disabled = false,
    startIcon = null,
    endIcon = null,
    ...buttonProps
}) => {
    return (
        <Button
            {...buttonProps}
            disabled={loading || disabled}
            startIcon={loading ? null : startIcon}
            endIcon={loading ? null : endIcon}
        >
            {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress
                        size={20}
                        thickness={4}
                        sx={{ color: 'inherit' }}
                    />
                    {loadingText || children}
                </Box>
            ) : (
                children
            )}
        </Button>
    );
};

export default LoadingButton;
