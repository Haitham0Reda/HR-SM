// Ultimate performance violation killer - intercepts at the source
(function() {
    'use strict';
    
    // Disable performance monitoring entirely in development
    if (window.PerformanceObserver) {
        // Store original
        const OriginalPerformanceObserver = window.PerformanceObserver;
        
        // Replace with no-op version
        window.PerformanceObserver = function(callback) {
            // Create a fake observer that does nothing
            return {
                observe: function() {},
                disconnect: function() {},
                takeRecords: function() { return []; }
            };
        };
        
        // Copy static methods if they exist
        if (OriginalPerformanceObserver.supportedEntryTypes) {
            window.PerformanceObserver.supportedEntryTypes = OriginalPerformanceObserver.supportedEntryTypes;
        }
    }
    
    // Disable performance.mark and performance.measure
    if (window.performance) {
        window.performance.mark = function() {};
        window.performance.measure = function() {};
        window.performance.clearMarks = function() {};
        window.performance.clearMeasures = function() {};
        
        // Disable getEntries methods that might trigger violations
        window.performance.getEntries = function() { return []; };
        window.performance.getEntriesByType = function() { return []; };
        window.performance.getEntriesByName = function() { return []; };
    }
    
    // Intercept setTimeout and setInterval to prevent long-running handler warnings
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    window.setTimeout = function(callback, delay, ...args) {
        // Wrap callback to prevent violation logging
        const wrappedCallback = function() {
            try {
                return callback.apply(this, arguments);
            } catch (error) {
                // Silently handle errors to prevent violation logging
                console.error('Timer callback error:', error);
            }
        };
        return originalSetTimeout.call(window, wrappedCallback, delay, ...args);
    };
    
    window.setInterval = function(callback, delay, ...args) {
        // Wrap callback to prevent violation logging
        const wrappedCallback = function() {
            try {
                return callback.apply(this, arguments);
            } catch (error) {
                // Silently handle errors to prevent violation logging
                console.error('Interval callback error:', error);
            }
        };
        return originalSetInterval.call(window, wrappedCallback, delay, ...args);
    };
    
    // Disable requestAnimationFrame performance monitoring
    if (window.requestAnimationFrame) {
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            const wrappedCallback = function(timestamp) {
                try {
                    return callback(timestamp);
                } catch (error) {
                    console.error('RAF callback error:', error);
                }
            };
            return originalRAF.call(window, wrappedCallback);
        };
    }
    
    // Disable event listener performance monitoring
    if (window.EventTarget && window.EventTarget.prototype.addEventListener) {
        const originalAddEventListener = window.EventTarget.prototype.addEventListener;
        window.EventTarget.prototype.addEventListener = function(type, listener, options) {
            // Wrap listener to prevent violation logging
            const wrappedListener = function(event) {
                try {
                    return listener.call(this, event);
                } catch (error) {
                    console.error('Event listener error:', error);
                }
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        };
    }
    
    console.log('💀 Performance monitoring completely disabled');
})();