/**
 * AnimatedList Component
 * 
 * Wraps list items with staggered entrance animations.
 * Each item appears with a slight delay after the previous one.
 * 
 * Usage:
 * <AnimatedList>
 *   {items.map((item, index) => (
 *     <ListItem key={index}>{item}</ListItem>
 *   ))}
 * </AnimatedList>
 */

import React from 'react';
import { Fade, Slide } from '@mui/material';

const AnimatedList = ({
    children,
    staggerDelay = 100,
    direction = 'up',
    timeout = 500
}) => {
    const childrenArray = React.Children.toArray(children);

    return (
        <>
            {childrenArray.map((child, index) => (
                <Fade
                    key={index}
                    in={true}
                    timeout={timeout}
                    style={{ transitionDelay: `${index * staggerDelay}ms` }}
                >
                    <Slide
                        direction={direction}
                        in={true}
                        timeout={timeout}
                        style={{ transitionDelay: `${index * staggerDelay}ms` }}
                    >
                        <div>
                            {child}
                        </div>
                    </Slide>
                </Fade>
            ))}
        </>
    );
};

export default AnimatedList;
