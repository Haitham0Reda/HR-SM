import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/providers/ReduxAuthProvider';
import { useModules } from '../store/providers/ReduxModuleProvider';

const ProtectedRoute = ({ children, requiredRole, requiredModule }) => {
    const { isAuthenticated, user, hasRole, loading: authLoading } = useAuth();
    const { isModuleEnabled, loading: moduleLoading } = useModules();

    if (authLoading || moduleLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    if (requiredModule && !isModuleEnabled(requiredModule)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Module Not Available</h2>
                    <p className="text-gray-600">
                        The {requiredModule} module is not enabled for your organization.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Contact your administrator to enable this feature.
                    </p>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
