/**
 * Performance Optimization Utilities
 * 
 * Collection of utilities to optimize React component performance
 * and reduce unnecessary re-renders.
 */

import { useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook to debounce a value
 * Useful for search inputs and other frequently changing values
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - Debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to throttle a function
 * Useful for scroll handlers and resize handlers
 * 
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Throttled function
 */
export function useThrottle(callback, delay = 300) {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, delay]
  );
}

/**
 * Custom hook to detect if component is mounted
 * Prevents state updates on unmounted components
 * 
 * @returns {Object} - Object with isMounted ref
 */
export function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Custom hook for lazy loading images
 * Uses Intersection Observer API for efficient image loading
 * 
 * @param {string} src - Image source URL
 * @param {Object} options - Intersection Observer options
 * @returns {Object} - Object with loaded state and image ref
 */
export function useLazyImage(src, options = {}) {
  const [loaded, setLoaded] = React.useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            setLoaded(true);
            if (imgRef.current) {
              imgRef.current.src = src;
            }
          };
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [src, options]);

  return { loaded, imgRef };
}

/**
 * Shallow comparison function for React.memo
 * Compares props to determine if component should re-render
 * 
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 * @returns {boolean} - True if props are equal (skip re-render)
 */
export function shallowEqual(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (let key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep comparison function for complex props
 * Use sparingly as it's more expensive than shallow comparison
 * 
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @returns {boolean} - True if objects are deeply equal
 */
export function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    obj1 === null ||
    typeof obj2 !== 'object' ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Memoization helper for expensive computations
 * Caches results based on input arguments
 * 
 * @param {Function} fn - Function to memoize
 * @returns {Function} - Memoized function
 */
export function memoize(fn) {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  };
}

/**
 * Custom hook for window resize events with throttling
 * 
 * @param {Function} callback - Callback to execute on resize
 * @param {number} delay - Throttle delay in milliseconds
 */
export function useWindowResize(callback, delay = 300) {
  const throttledCallback = useThrottle(callback, delay);

  useEffect(() => {
    window.addEventListener('resize', throttledCallback);
    return () => {
      window.removeEventListener('resize', throttledCallback);
    };
  }, [throttledCallback]);
}

/**
 * Custom hook for scroll events with throttling
 * 
 * @param {Function} callback - Callback to execute on scroll
 * @param {number} delay - Throttle delay in milliseconds
 */
export function useScroll(callback, delay = 300) {
  const throttledCallback = useThrottle(callback, delay);

  useEffect(() => {
    window.addEventListener('scroll', throttledCallback);
    return () => {
      window.removeEventListener('scroll', throttledCallback);
    };
  }, [throttledCallback]);
}

// Import React for hooks
import React from 'react';
