import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import PropTypes from 'prop-types';
import InboxIcon from '@mui/icons-material/Inbox';

const EmptyState = ({
    icon: Icon = InboxIcon,
    title = 'No data available',
    description,
    action,
    actionLabel,
    onAction,
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                px: 3,
                textAlign: 'center',
            }}
        >
            <Box
                sx={{
                    p: 3,
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    mb: 3,
                }}
            >
                <Icon
                    sx={{
                        fontSize: 64,
                        color: 'text.disabled',
                    }}
                />
            </Box>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: 'text.primary',
                }}
            >
                {title}
            </Typography>
            {description && (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 3,
                        maxWidth: 400,
                        lineHeight: 1.6,
                    }}
                >
                    {description}
                </Typography>
            )}
            {action || (actionLabel && onAction) ? (
                action || (
                    <Button variant="contained" onClick={onAction} size="large">
                        {actionLabel}
                    </Button>
                )
            ) : null}
        </Box>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.elementType,
    title: PropTypes.string,
    description: PropTypes.string,
    action: PropTypes.node,
    actionLabel: PropTypes.string,
    onAction: PropTypes.func,
};

export default EmptyState;
