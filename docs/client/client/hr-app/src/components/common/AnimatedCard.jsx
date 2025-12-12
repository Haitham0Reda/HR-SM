/**
 * AnimatedCard Component
 * 
 * A reusable card wrapper with hover animations and entrance effects.
 * Can be used to wrap any card content across the application.
 * 
 * Usage:
 * <AnimatedCard delay={200}>
 *   <Card>Your content</Card>
 * </AnimatedCard>
 */

import React from 'react';
import { Zoom, Box } from '@mui/material';

const AnimatedCard = ({
    children,
    delay = 0,
    timeout = 800,
    hoverEffect = true
}) => {
    return (
        <Zoom in={true} timeout={timeout} style={{ transitionDelay: `${delay}ms` }}>
            <Box
                sx={{
                    height: '100%',
                    width: '100%',
                    transition: 'all 0.3s ease-in-out',
                    ...(hoverEffect && {
                        '&:hover': {
                            transform: 'translateY(-8px) scale(1.02)',
                            '& > *': {
                                boxShadow: 8,
                            }
                        }
                    })
                }}
            >
                {children}
            </Box>
        </Zoom>
    );
};

export default AnimatedCard;
