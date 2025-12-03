import React, { useEffect, useState } from 'react';
import { Box, Typography, Modal, Card, CardContent } from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';
import confetti from 'canvas-confetti';

const CongratulationsEffect = ({ employee, month, onClose }) => {
    const [open, setOpen] = useState(true);

    useEffect(() => {
        if (open) {
            // Trigger confetti effect
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };

            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // Fire confetti from two sides
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            // Auto close after 5 seconds
            const timer = setTimeout(() => {
                handleClose();
            }, 5000);

            return () => {
                clearInterval(interval);
                clearTimeout(timer);
            };
        }
    }, [open]);

    const handleClose = () => {
        setOpen(false);
        if (onClose) onClose();
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1500,
            }}
        >
            <Card
                sx={{
                    maxWidth: 600,
                    width: '90%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    boxShadow: 24,
                    animation: 'slideIn 0.5s ease-out',
                    '@keyframes slideIn': {
                        from: {
                            transform: 'scale(0.5) translateY(-100px)',
                            opacity: 0,
                        },
                        to: {
                            transform: 'scale(1) translateY(0)',
                            opacity: 1,
                        },
                    },
                }}
            >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                        sx={{
                            fontSize: '80px',
                            animation: 'bounce 1s infinite',
                            '@keyframes bounce': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-20px)' },
                            },
                        }}
                    >
                        🏆
                    </Box>

                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 700,
                            mb: 2,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                        }}
                    >
                        Congratulations!
                    </Typography>

                    <Typography
                        variant="h5"
                        sx={{
                            mb: 3,
                            fontWeight: 500,
                        }}
                    >
                        You are the Employee of the Month
                    </Typography>

                    <Box
                        sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 2,
                            p: 2,
                            mb: 2,
                        }}
                    >
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {month}
                        </Typography>
                    </Box>

                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: '1.1rem',
                            lineHeight: 1.6,
                            opacity: 0.95,
                        }}
                    >
                        Your outstanding performance and dedication have been recognized!
                        Keep up the excellent work! 🌟
                    </Typography>
                </CardContent>
            </Card>
        </Modal>
    );
};

export default CongratulationsEffect;
