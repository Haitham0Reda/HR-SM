/**
 * AnimatedButton Component
 * 
 * A button wrapper that adds smooth hover and click animations.
 * 
 * Usage:
 * <AnimatedButton>
 *   <Button>Click Me</Button>
 * </AnimatedButton>
 */

import React from 'react';
import { Box } from '@mui/material';

const AnimatedButton = ({
    children,
    scaleOnHover = 1.05,
    scaleOnClick = 0.95
}) => {
    const [isPressed, setIsPressed] = React.useState(false);

    return (
        <Box
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            sx={{
                display: 'inline-block',
                transition: 'transform 0.2s ease',
                transform: isPressed ? `scale(${scaleOnClick})` : 'scale(1)',
                '&:hover': {
                    transform: `scale(${scaleOnHover})`,
                },
                '&:active': {
                    transform: `scale(${scaleOnClick})`,
                }
            }}
        >
            {children}
        </Box>
    );
};

export default AnimatedButton;
