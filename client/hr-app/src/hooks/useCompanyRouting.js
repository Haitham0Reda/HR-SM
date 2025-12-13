import { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    companyNameToSlug, 
    generateCompanyRoute, 
    extractCompanySlug, 
    extractInternalPath,
    validateSlugMatch 
} from '../utils/companySlug';

/**
 * Hook for managing company-based routing
 * Provides utilities for navigating within company-scoped routes
 */
export const useCompanyRouting = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, tenant } = useAuth();

    // Memoize company info to prevent unnecessary re-renders
    const companyInfo = useMemo(() => {
        const companyName = tenant?.name || user?.company?.name || user?.companyName || 'TechCorp Solutions';
        const companySlug = companyNameToSlug(companyName);
        return { companyName, companySlug };
    }, [tenant?.name, user?.company?.name, user?.companyName]);

    // Memoize route info to prevent unnecessary re-renders
    const routeInfo = useMemo(() => {
        const isCompanyRoute = location.pathname.startsWith('/company/');
        const currentCompanySlug = extractCompanySlug(location.pathname);
        const currentInternalPath = extractInternalPath(location.pathname);
        const isValidCompanyRoute = isCompanyRoute && validateSlugMatch(currentCompanySlug, companyInfo.companyName);
        
        return {
            isCompanyRoute,
            currentCompanySlug,
            currentInternalPath,
            isValidCompanyRoute
        };
    }, [location.pathname, companyInfo.companyName]);
    
    // Debug logging completely removed - routing is working correctly



    /**
     * Navigate to a path within the company scope
     * @param {string} path - The internal path to navigate to
     * @param {object} options - Navigation options
     */
    const navigateToCompanyPath = useCallback((path, options = {}) => {
        const companyRoute = generateCompanyRoute(companyInfo.companyName, path);
        navigate(companyRoute, options);
    }, [navigate, companyInfo.companyName]);

    /**
     * Navigate to company dashboard
     */
    const navigateToCompanyDashboard = useCallback(() => {
        navigateToCompanyPath('/dashboard');
    }, [navigateToCompanyPath]);

    /**
     * Get company route for a given path
     * @param {string} path - The internal path
     * @returns {string} Full company route
     */
    const getCompanyRoute = useCallback((path) => {
        return generateCompanyRoute(companyInfo.companyName, path);
    }, [companyInfo.companyName]);

    /**
     * Check if user should be redirected to company route
     * @returns {boolean} True if redirect is needed
     */
    const shouldRedirectToCompanyRoute = useCallback(() => {
        // Don't redirect if user is not authenticated
        if (!user) {
            return false;
        }

        // Don't redirect on public pages
        const publicPages = ['/', '/login', '/forgot-password', '/reset-password', '/error', '/404', '/debug', '/test'];
        if (publicPages.includes(location.pathname) || publicPages.some(page => location.pathname.startsWith(page))) {
            return false;
        }

        // If not on a company route but user is authenticated, redirect to company route
        if (!routeInfo.isCompanyRoute) {
            return true;
        }
        
        // If on company route but slug doesn't match current company, redirect to correct company
        if (routeInfo.isCompanyRoute && !routeInfo.isValidCompanyRoute && tenant) {
            return true;
        }

        return false;
    }, [routeInfo.isCompanyRoute, routeInfo.isValidCompanyRoute, user, location.pathname, tenant]);

    /**
     * Redirect to appropriate company route
     */
    const redirectToCompanyRoute = useCallback(() => {
        if (routeInfo.isCompanyRoute && !routeInfo.isValidCompanyRoute) {
            // Redirect to correct company with same internal path
            navigateToCompanyPath(routeInfo.currentInternalPath);
        } else if (!routeInfo.isCompanyRoute && user) {
            // Redirect to company dashboard
            navigateToCompanyDashboard();
        }
    }, [routeInfo.isCompanyRoute, routeInfo.isValidCompanyRoute, routeInfo.currentInternalPath, navigateToCompanyPath, user, navigateToCompanyDashboard]);

    return {
        // Company info
        companyName: companyInfo.companyName,
        companySlug: companyInfo.companySlug,
        
        // Route info
        isCompanyRoute: routeInfo.isCompanyRoute,
        isValidCompanyRoute: routeInfo.isValidCompanyRoute,
        currentCompanySlug: routeInfo.currentCompanySlug,
        currentInternalPath: routeInfo.currentInternalPath,
        
        // Navigation functions
        navigateToCompanyPath,
        navigateToCompanyDashboard,
        getCompanyRoute,
        
        // Redirect logic
        shouldRedirectToCompanyRoute,
        redirectToCompanyRoute
    };
};