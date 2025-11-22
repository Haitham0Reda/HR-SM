import { useState, useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';

export const useApi = (apiFunc) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { showError } = useNotification();

    const execute = useCallback(
        async (...args) => {
            try {
                setLoading(true);
                setError(null);
                const result = await apiFunc(...args);
                setData(result);
                return result;
            } catch (err) {
                // Ensure we're setting a string value for the error
                const errorMessage = err?.message || err?.response?.data?.error || (typeof err === 'string' ? err : 'An unexpected error occurred');
                setError(typeof errorMessage === 'string' ? errorMessage : 'An unexpected error occurred');
                showError(err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [apiFunc, showError]
    );

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return { data, loading, error, execute, reset };
};

export default useApi;
