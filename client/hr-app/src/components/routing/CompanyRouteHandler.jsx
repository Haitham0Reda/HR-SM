import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';

/**
 * Component that handles company-based route redirects
 * Ensures users are always on the correct company-scoped route
 */
const CompanyRouteHandler = ({ children }) => {
    const { user, tenant, loading } = useAuth();
    const location = useLocation();
    const { shouldRedirectToCompanyRoute, redirectToCompanyRoute } = useCompanyRouting();
    const redirectInProgressRef = useRef(false);

    useEffect(() => {
        // Prevent multiple redirects in progress
        if (redirectInProgressRef.current) {
            return;
        }

        // Don't redirect while loading or if user is not authenticated
        if (loading || !user) {
            return;
        }

        // Don't redirect on login/auth pages
        const authPages = ['/', '/login', '/forgot-password', '/reset-password'];
        if (authPages.some(page => location.pathname.startsWith(page))) {
            return;
        }

        // Don't redirect on error pages
        const errorPages = ['/error', '/404'];
        if (errorPages.some(page => location.pathname.startsWith(page))) {
            return;
        }

        // Wait for tenant info to be loaded before redirecting, but don't wait forever
        // If tenant is null after user is loaded, use fallback company name
        if (!tenant && loading) {
            return;
        }

        // Check if redirect is needed
        if (shouldRedirectToCompanyRoute()) {
            redirectInProgressRef.current = true;
            redirectToCompanyRoute();
            
            // Reset flag after a short delay to allow for navigation
            setTimeout(() => {
                redirectInProgressRef.current = false;
            }, 100);
        }
    }, [user, tenant, loading, location.pathname, shouldRedirectToCompanyRoute, redirectToCompanyRoute]);

    return children;
};

export default CompanyRouteHandler;