/**
 * LoadingOverlay Component with Theme Colors
 * 
 * Full-screen loading overlay with backdrop blur effect
 * Perfect for blocking UI during async operations
 * 
 * Usage:
 * <LoadingOverlay open={isLoading} message="Saving..." />
 */

import React from 'react';
import { Backdrop, Box, Typography, Fade } from '@mui/material';

const LoadingOverlay = ({
    open = false,
    message = 'Loading...',
    variant = 'gradient',
    blur = true
}) => {
    // Gradient Spinner with Theme Colors
    const GradientSpinner = () => (
        <Box
            sx={{
                position: 'relative',
                width: 80,
                height: 80,
            }}
        >
            {/* Outer rotating gradient ring */}
            <Box
                sx={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.secondary.light} 100%)`,
                    animation: 'rotate 1.5s linear infinite',
                    '@keyframes rotate': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                    }
                }}
            />
            {/* Inner circle */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '80%',
                    height: '80%',
                    borderRadius: '50%',
                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                }}
            />
            {/* Center pulsing dot */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '35%',
                    left: '35%',
                    width: '30%',
                    height: '30%',
                    borderRadius: '50%',
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.2)', opacity: 0.7 }
                    }
                }}
            />
        </Box>
    );

    // Orbiting Dots with Theme Colors
    const OrbitingDots = () => (
        <Box
            sx={{
                position: 'relative',
                width: 80,
                height: 80,
            }}
        >
            {[0, 1, 2, 3].map((index) => (
                <Box
                    key={index}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: 12,
                        height: 12,
                        marginTop: '-6px',
                        marginLeft: '-6px',
                        borderRadius: '50%',
                        background: (theme) => index % 2 === 0
                            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`
                            : `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`,
                        animation: 'orbit 2s linear infinite',
                        animationDelay: `${index * 0.5}s`,
                        transformOrigin: '0 0',
                        boxShadow: (theme) => `0 0 10px ${index % 2 === 0 ? theme.palette.primary.main : theme.palette.secondary.main}`,
                        '@keyframes orbit': {
                            '0%': {
                                transform: 'rotate(0deg) translateX(35px) rotate(0deg)',
                                opacity: 1
                            },
                            '50%': {
                                opacity: 0.5
                            },
                            '100%': {
                                transform: 'rotate(360deg) translateX(35px) rotate(-360deg)',
                                opacity: 1
                            }
                        }
                    }}
                />
            ))}
            {/* Center glowing dot */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 16,
                    height: 16,
                    marginTop: '-8px',
                    marginLeft: '-8px',
                    borderRadius: '50%',
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    boxShadow: (theme) => `0 0 20px ${theme.palette.primary.main}`,
                    animation: 'glow 2s ease-in-out infinite',
                    '@keyframes glow': {
                        '0%, 100%': {
                            transform: 'scale(1)',
                            opacity: 1
                        },
                        '50%': {
                            transform: 'scale(1.3)',
                            opacity: 0.7
                        }
                    }
                }}
            />
        </Box>
    );

    const renderLoader = () => {
        switch (variant) {
            case 'orbit':
                return <OrbitingDots />;
            case 'gradient':
            default:
                return <GradientSpinner />;
        }
    };

    return (
        <Backdrop
            open={open}
            sx={{
                color: '#fff',
                zIndex: (theme) => theme.zIndex.drawer + 1000,
                backdropFilter: blur ? 'blur(8px)' : 'none',
                backgroundColor: blur ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
            }}
        >
            <Fade in={open} timeout={300}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                    }}
                >
                    {renderLoader()}

                    {message && (
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'white',
                                fontWeight: 500,
                                textAlign: 'center',
                                animation: 'fadeInOut 2s ease-in-out infinite',
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                '@keyframes fadeInOut': {
                                    '0%, 100%': { opacity: 1 },
                                    '50%': { opacity: 0.5 }
                                }
                            }}
                        >
                            {message}
                        </Typography>
                    )}
                </Box>
            </Fade>
        </Backdrop>
    );
};

export default LoadingOverlay;
