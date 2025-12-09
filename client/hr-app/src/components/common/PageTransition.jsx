/**
 * PageTransition Component
 * 
 * A reusable wrapper component that adds smooth animations to any page.
 * Provides fade-in and slide-up effects on page load.
 * 
 * Usage:
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 */

import React from 'react';
import { Fade, Slide, Box } from '@mui/material';

const PageTransition = ({
    children,
    direction = 'up',
    timeout = 600,
    delay = 0
}) => {
    return (
        <Fade in={true} timeout={timeout} style={{ transitionDelay: `${delay}ms` }}>
            <Slide direction={direction} in={true} timeout={timeout}>
                <Box sx={{ height: '100%', width: '100%' }}>
                    {children}
                </Box>
            </Slide>
        </Fade>
    );
};

export default PageTransition;
