import { useState, useEffect } from 'react';

/**
 * Hook to detect if the device is mobile (width < 768px)
 * @returns {boolean} True if mobile device
 */
export const useMobileCheck = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkMobile();

        // Listen for resize events
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    return isMobile;
};
