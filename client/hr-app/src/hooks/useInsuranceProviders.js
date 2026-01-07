import { useState, useCallback, useEffect } from 'react';
import { insuranceService } from '../services/insurance.service';
import useNotifications from './useNotifications';

/**
 * Custom hook for managing insurance providers
 */
export const useInsuranceProviders = () => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [statisticsLoading, setStatisticsLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    const notifications = useNotifications();

    // Auto-refresh statistics when providers change
    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                setStatisticsLoading(true);
                const response = await insuranceService.getProviderStatistics();
                if (response.success) {
                    setStatistics(response.data);
                }
            } catch (err) {
                console.error('Error fetching provider statistics:', err);
            } finally {
                setStatisticsLoading(false);
            }
        };

        // Fetch statistics when component mounts or when refresh is triggered
        if (refreshTrigger >= 0) {
            fetchStatistics();
        }
    }, [refreshTrigger]);

    // Trigger statistics refresh
    const triggerStatisticsRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // Get all providers
    const getProviders = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await insuranceService.getProviders(params);
            
            if (response.success) {
                setProviders(response.data.providers || []);
                setPagination(response.data.pagination);
                
                // Trigger statistics refresh after loading providers
                triggerStatisticsRefresh();
            } else {
                throw new Error(response.message || 'Failed to fetch providers');
            }
        } catch (err) {
            console.error('Error fetching providers:', err);
            setError(err.message || 'Failed to fetch providers');
            setProviders([]);
        } finally {
            setLoading(false);
        }
    }, [triggerStatisticsRefresh]);

    // Get provider statistics (now handled by useEffect)
    const getStatistics = useCallback(async () => {
        triggerStatisticsRefresh();
    }, [triggerStatisticsRefresh]);

    // Create new provider
    const createProvider = useCallback(async (providerData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await insuranceService.createProvider(providerData);
            
            if (response.success) {
                notifications.show('Provider created successfully', { severity: 'success' });
                // Trigger async statistics refresh
                triggerStatisticsRefresh();
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to create provider');
            }
        } catch (err) {
            console.error('Error creating provider:', err);
            const errorMessage = err.message || 'Failed to create provider';
            setError(errorMessage);
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications, triggerStatisticsRefresh]);

    // Update provider
    const updateProvider = useCallback(async (providerId, providerData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await insuranceService.updateProvider(providerId, providerData);
            
            if (response.success) {
                notifications.show('Provider updated successfully', { severity: 'success' });
                // Trigger async statistics refresh
                triggerStatisticsRefresh();
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to update provider');
            }
        } catch (err) {
            console.error('Error updating provider:', err);
            const errorMessage = err.message || 'Failed to update provider';
            setError(errorMessage);
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications, triggerStatisticsRefresh]);

    // Delete provider
    const deleteProvider = useCallback(async (providerId) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await insuranceService.deleteProvider(providerId);
            
            if (response.success) {
                notifications.show('Provider deleted successfully', { severity: 'success' });
                // Trigger async statistics refresh
                triggerStatisticsRefresh();
                return true;
            } else {
                throw new Error(response.message || 'Failed to delete provider');
            }
        } catch (err) {
            console.error('Error deleting provider:', err);
            const errorMessage = err.message || 'Failed to delete provider';
            setError(errorMessage);
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications, triggerStatisticsRefresh]);

    // Activate provider
    const activateProvider = useCallback(async (providerId) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await insuranceService.activateProvider(providerId);
            
            if (response.success) {
                notifications.show('Provider activated successfully', { severity: 'success' });
                // Trigger async statistics refresh
                triggerStatisticsRefresh();
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to activate provider');
            }
        } catch (err) {
            console.error('Error activating provider:', err);
            const errorMessage = err.message || 'Failed to activate provider';
            setError(errorMessage);
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications, triggerStatisticsRefresh]);

    // Deactivate provider
    const deactivateProvider = useCallback(async (providerId, reason) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await insuranceService.deactivateProvider(providerId, reason);
            
            if (response.success) {
                notifications.show('Provider deactivated successfully', { severity: 'success' });
                // Trigger async statistics refresh
                triggerStatisticsRefresh();
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to deactivate provider');
            }
        } catch (err) {
            console.error('Error deactivating provider:', err);
            const errorMessage = err.message || 'Failed to deactivate provider';
            setError(errorMessage);
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications, triggerStatisticsRefresh]);

    return {
        providers,
        loading,
        error,
        pagination,
        statistics,
        statisticsLoading,
        getProviders,
        createProvider,
        updateProvider,
        deleteProvider,
        activateProvider,
        deactivateProvider,
        getStatistics
    };
};