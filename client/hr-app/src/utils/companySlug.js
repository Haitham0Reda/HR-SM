/**
 * Company Slug Utilities
 * Converts company names to URL-friendly slugs and vice versa
 */

/**
 * Convert company name to URL-friendly slug
 * @param {string} companyName - The company name
 * @returns {string} URL-friendly slug
 */
export const companyNameToSlug = (companyName) => {
    if (!companyName) return '';
    
    return companyName
        .toLowerCase()
        .trim()
        // Replace spaces and special characters with underscores (to match platform format)
        .replace(/[^a-z0-9]+/g, '_')
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, '')
        // Replace multiple consecutive underscores with single underscore
        .replace(/_+/g, '_');
};

/**
 * Convert URL slug back to display name (capitalize words)
 * @param {string} slug - The URL slug
 * @returns {string} Display-friendly name
 */
export const slugToDisplayName = (slug) => {
    if (!slug) return '';
    
    return slug
        .split('_') // Split on underscores instead of hyphens
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Validate if a slug matches a company name
 * @param {string} slug - The URL slug
 * @param {string} companyName - The company name
 * @returns {boolean} True if they match
 */
export const validateSlugMatch = (slug, companyName) => {
    if (!slug || !companyName) return false;
    return companyNameToSlug(companyName) === slug;
};

/**
 * Generate company route path
 * @param {string} companyName - The company name
 * @param {string} path - The internal path (e.g., '/dashboard', '/users')
 * @returns {string} Full company route path
 */
export const generateCompanyRoute = (companyName, path = '') => {
    const slug = companyNameToSlug(companyName);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/company/${slug}${cleanPath}`;
};

/**
 * Extract company slug from pathname
 * @param {string} pathname - The current pathname
 * @returns {string|null} Company slug or null if not a company route
 */
export const extractCompanySlug = (pathname) => {
    const match = pathname.match(/^\/company\/([^\/]+)/);
    return match ? match[1] : null;
};

/**
 * Extract internal path from company route
 * @param {string} pathname - The current pathname
 * @returns {string} Internal path (e.g., '/dashboard', '/users')
 */
export const extractInternalPath = (pathname) => {
    const match = pathname.match(/^\/company\/[^\/]+(.*)$/);
    return match ? (match[1] || '/') : pathname;
};