import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { debounce, throttle } from '../utils/helpers';

/**
 * Custom hook for performance optimization utilities
 */
export const usePerformanceOptimization = () => {
    /**
     * Create a debounced version of a function
     */
    const useDebouncedCallback = useCallback((callback, delay = 300, deps = []) => {
        return useMemo(
            () => debounce(callback, delay),
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [callback, delay, ...deps]
        );
    }, []);

    /**
     * Create a throttled version of a function
     */
    const useThrottledCallback = useCallback((callback, delay = 300, deps = []) => {
        return useMemo(
            () => throttle(callback, delay),
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [callback, delay, ...deps]
        );
    }, []);

    /**
     * Batch multiple state updates to prevent excessive re-renders
     */
    const useBatchedState = (initialState) => {
        const [state, setState] = useState(initialState);
        const batchedUpdates = useRef([]);
        const timeoutRef = useRef(null);

        const batchUpdate = useCallback((updates) => {
            batchedUpdates.current.push(updates);
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setState(prevState => {
                    let newState = { ...prevState };
                    batchedUpdates.current.forEach(update => {
                        if (typeof update === 'function') {
                            newState = update(newState);
                        } else {
                            newState = { ...newState, ...update };
                        }
                    });
                    batchedUpdates.current = [];
                    return newState;
                });
            }, 0);
        }, []);

        return [state, batchUpdate];
    };

    /**
     * Memoize expensive calculations
     */
    const useMemoizedValue = useCallback((computeValue, deps) => {
        return useMemo(computeValue, deps);
    }, []);

    /**
     * Prevent unnecessary re-renders by comparing array lengths
     */
    const useArrayMemo = useCallback((array, compareFn) => {
        return useMemo(() => array, [
            array.length,
            compareFn ? array.map(compareFn).join(',') : array
        ]);
    }, []);

    return {
        useDebouncedCallback,
        useThrottledCallback,
        useBatchedState,
        useMemoizedValue,
        useArrayMemo
    };
};

/**
 * Hook to detect and warn about performance issues
 */
export const usePerformanceMonitor = (componentName) => {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(Date.now());

    useEffect(() => {
        renderCount.current += 1;
        const now = Date.now();
        const timeSinceLastRender = now - lastRenderTime.current;
        
        // Warn if component is re-rendering too frequently
        if (timeSinceLastRender < 100 && renderCount.current > 5) {
            console.warn(`Performance Warning: ${componentName} has rendered ${renderCount.current} times in the last ${timeSinceLastRender}ms`);
        }
        
        lastRenderTime.current = now;
    });

    return renderCount.current;
};

export default usePerformanceOptimization;