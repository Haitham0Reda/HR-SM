import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const Loading = ({ message = 'Loading...', fullScreen = false }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: fullScreen ? '100vh' : '400px',
                gap: 2,
                p: 3,
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    display: 'inline-flex',
                }}
            >
                <CircularProgress
                    size={60}
                    thickness={4}
                    sx={{
                        color: 'primary.main',
                        animationDuration: '1s',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <CircularProgress
                        size={40}
                        thickness={4}
                        sx={{
                            color: 'secondary.main',
                            animationDuration: '1.5s',
                        }}
                    />
                </Box>
            </Box>
            <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                    fontWeight: 500,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': {
                            opacity: 1,
                        },
                        '50%': {
                            opacity: 0.5,
                        },
                    },
                }}
            >
                {message}
            </Typography>
        </Box>
    );
};

export default Loading;
