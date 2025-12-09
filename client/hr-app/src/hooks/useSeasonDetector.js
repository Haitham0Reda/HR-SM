import { useState, useEffect } from 'react';

/**
 * Hook to automatically detect the current season based on date
 * @returns {string} Current season: 'christmas', 'newyear', 'eid-fitr', 'eid-adha', or 'none'
 */
export const useSeasonDetector = () => {
    const [season, setSeason] = useState('none');

    useEffect(() => {
        const detectSeason = () => {
            const now = new Date();
            const month = now.getMonth() + 1; // 1-12
            const day = now.getDate();

            // Christmas: December 15 - December 31
            if (month === 12 && day >= 15) {
                return 'christmas';
            }

            // New Year: January 1 - January 7
            if (month === 1 && day <= 7) {
                return 'newyear';
            }

            // Eid al-Fitr detection (approximate - should use Hijri calendar)
            // This is a simplified version. In production, use a proper Islamic calendar library
            // Example: Ramadan 2024 ends around April 10, so Eid al-Fitr is around April 10-12
            const eidFitrDates = getEidFitrDates(now.getFullYear());
            if (isWithinDateRange(now, eidFitrDates.start, eidFitrDates.end)) {
                return 'eid-fitr';
            }

            // Eid al-Adha detection (approximate - should use Hijri calendar)
            // Example: Eid al-Adha 2024 is around June 16-19
            const eidAdhaDates = getEidAdhaDates(now.getFullYear());
            if (isWithinDateRange(now, eidAdhaDates.start, eidAdhaDates.end)) {
                return 'eid-adha';
            }

            return 'none';
        };

        setSeason(detectSeason());

        // Check every hour for season changes
        const interval = setInterval(() => {
            setSeason(detectSeason());
        }, 3600000); // 1 hour

        return () => clearInterval(interval);
    }, []);

    return season;
};

/**
 * Get approximate Eid al-Fitr dates for a given year
 * Note: In production, use a proper Hijri calendar library like 'hijri-date' or 'moment-hijri'
 */
const getEidFitrDates = (year) => {
    // Approximate dates - these should be updated yearly or calculated using Hijri calendar
    const eidFitrApproximate = {
        2024: { month: 4, day: 10 },  // April 10, 2024
        2025: { month: 3, day: 30 },  // March 30, 2025
        2026: { month: 3, day: 20 },  // March 20, 2026
    };

    const date = eidFitrApproximate[year] || { month: 4, day: 10 };

    return {
        start: new Date(year, date.month - 1, date.day),
        end: new Date(year, date.month - 1, date.day + 3) // 3 days celebration
    };
};

/**
 * Get approximate Eid al-Adha dates for a given year
 */
const getEidAdhaDates = (year) => {
    // Approximate dates - these should be updated yearly or calculated using Hijri calendar
    const eidAdhaApproximate = {
        2024: { month: 6, day: 16 },  // June 16, 2024
        2025: { month: 6, day: 6 },   // June 6, 2025
        2026: { month: 5, day: 27 },  // May 27, 2026
    };

    const date = eidAdhaApproximate[year] || { month: 6, day: 16 };

    return {
        start: new Date(year, date.month - 1, date.day),
        end: new Date(year, date.month - 1, date.day + 4) // 4 days celebration
    };
};

/**
 * Check if a date is within a range
 */
const isWithinDateRange = (date, start, end) => {
    return date >= start && date <= end;
};
