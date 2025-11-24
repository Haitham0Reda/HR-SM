/**
 * Enhanced Loading Component with Theme Colors
 * 
 * Modern loading component with multiple animation styles
 * Uses your app's color palette for consistent branding
 * 
 * Props:
 * - message: Loading message text
 * - fullScreen: Whether to take full screen height
 * - variant: 'spinner' | 'dots' | 'pulse' | 'bars' | 'gradient' (default: 'gradient')
 * - size: 'small' | 'medium' | 'large' (default: 'medium')
 */

import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

const Loading = ({
    message = 'Loading...',
    fullScreen = false,
    variant = 'gradient',
    size = 'medium'
}) => {
    const sizes = {
        small: { spinner: 40, dots: 8, bars: 30 },
        medium: { spinner: 60, dots: 12, bars: 40 },
        large: { spinner: 80, dots: 16, bars: 50 }
    };

    const currentSize = sizes[size];

    // Gradient Spinner (Default - Most Modern)
    const GradientSpinner = () => (
        <Box
            sx={{
                position: 'relative',
                width: currentSize.spinner,
                height: currentSize.spinner,
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
            {/* Inner circle to create ring effect */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '80%',
                    height: '80%',
                    borderRadius: '50%',
                    bgcolor: 'background.default',
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

    // Animated Dots
    const AnimatedDots = () => (
        <Box sx={{ display: 'flex', gap: 1.5 }}>
            {[0, 1, 2].map((index) => (
                <Box
                    key={index}
                    sx={{
                        width: currentSize.dots,
                        height: currentSize.dots,
                        borderRadius: '50%',
                        background: (theme) => index === 0
                            ? theme.palette.primary.main
                            : index === 1
                                ? theme.palette.secondary.main
                                : theme.palette.primary.light,
                        animation: 'bounce 1.4s ease-in-out infinite',
                        animationDelay: `${index * 0.16}s`,
                        '@keyframes bounce': {
                            '0%, 80%, 100%': {
                                transform: 'scale(0) translateY(0)',
                                opacity: 0.5
                            },
                            '40%': {
                                transform: 'scale(1) translateY(-10px)',
                                opacity: 1
                            }
                        }
                    }}
                />
            ))}
        </Box>
    );

    // Pulsing Circle
    const PulsingCircle = () => (
        <Box sx={{ position: 'relative', width: currentSize.spinner, height: currentSize.spinner }}>
            {[0, 1, 2].map((index) => (
                <Box
                    key={index}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '3px solid',
                        borderColor: index % 2 === 0 ? 'primary.main' : 'secondary.main',
                        opacity: 0,
                        animation: 'ripple 2s ease-out infinite',
                        animationDelay: `${index * 0.6}s`,
                        '@keyframes ripple': {
                            '0%': {
                                transform: 'scale(0.8)',
                                opacity: 1
                            },
                            '100%': {
                                transform: 'scale(1.5)',
                                opacity: 0
                            }
                        }
                    }}
                />
            ))}
            <Box
                sx={{
                    position: 'absolute',
                    top: '25%',
                    left: '25%',
                    width: '50%',
                    height: '50%',
                    borderRadius: '50%',
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.1)' }
                    }
                }}
            />
        </Box>
    );

    // Animated Bars
    const AnimatedBars = () => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: currentSize.bars }}>
            {[0, 1, 2, 3, 4].map((index) => (
                <Box
                    key={index}
                    sx={{
                        width: 6,
                        height: '100%',
                        background: (theme) => index % 2 === 0
                            ? `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                            : `linear-gradient(180deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
                        borderRadius: 1,
                        animation: 'wave 1.2s ease-in-out infinite',
                        animationDelay: `${index * 0.1}s`,
                        transformOrigin: 'bottom',
                        '@keyframes wave': {
                            '0%, 100%': {
                                transform: 'scaleY(0.3)',
                                opacity: 0.5
                            },
                            '50%': {
                                transform: 'scaleY(1)',
                                opacity: 1
                            }
                        }
                    }}
                />
            ))}
        </Box>
    );

    // Double Spinner (Original Enhanced)
    const DoubleSpinner = () => (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
                size={currentSize.spinner}
                thickness={3}
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
                    size={currentSize.spinner * 0.65}
                    thickness={3}
                    sx={{
                        color: 'secondary.main',
                        animationDuration: '1.5s',
                    }}
                />
            </Box>
        </Box>
    );

    const renderLoader = () => {
        switch (variant) {
            case 'dots':
                return <AnimatedDots />;
            case 'pulse':
                return <PulsingCircle />;
            case 'bars':
                return <AnimatedBars />;
            case 'spinner':
                return <DoubleSpinner />;
            case 'gradient':
            default:
                return <GradientSpinner />;
        }
    };

    return (
        <Fade in={true} timeout={300}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: fullScreen ? '100vh' : '400px',
                    gap: 3,
                    p: 3,
                }}
            >
                {renderLoader()}

                {message && (
                    <Typography
                        variant={size === 'small' ? 'body2' : 'body1'}
                        color="text.secondary"
                        sx={{
                            fontWeight: 500,
                            animation: 'fadeInOut 2s ease-in-out infinite',
                            '@keyframes fadeInOut': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.4 }
                            }
                        }}
                    >
                        {message}
                    </Typography>
                )}
            </Box>
        </Fade>
    );
};

export default Loading;
