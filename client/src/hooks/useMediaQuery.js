import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design with media queries
 * 
 * @param {string} query - Media query string
 * @returns {boolean} - Whether the media query matches
 */
export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);

        // Set initial value
        setMatches(media.matches);

        // Create event listener
        const listener = (e) => setMatches(e.matches);

        // Add listener
        media.addEventListener('change', listener);

        // Cleanup
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
};

// Predefined breakpoint hooks
export const useIsMobile = () => useMediaQuery('(max-width: 600px)');
export const useIsTablet = () => useMediaQuery('(min-width: 600px) and (max-width: 900px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 900px)');

export default useMediaQuery;
