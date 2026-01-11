// Performance violation filter - runs immediately when page loads
(function() {
    'use strict';
    
    if (typeof window !== 'undefined') {
        // Store original console methods
        const originalConsole = {
            warn: console.warn,
            error: console.error,
            log: console.log,
            info: console.info,
            debug: console.debug
        };
        
        // More comprehensive violation patterns
        const violationPatterns = [
            /\[Violation\]/i,
            /handler took \d+ms/i,
            /Forced reflow/i,
            /loadend.*handler took/i,
            /Long running/i,
            /react-dom-client\.development\.js/i,
            /scheduler\.development\.js/i,
            /message.*handler took/i,
            /Violation.*message/i,
            /Violation.*loadend/i
        ];
        
        // Create a more aggressive filter function
        function shouldFilterMessage(args) {
            // Check all arguments, not just the first one
            return args.some(arg => {
                if (typeof arg === 'string') {
                    return violationPatterns.some(pattern => pattern.test(arg));
                }
                // Check if it's an object with a message property
                if (arg && typeof arg === 'object' && arg.message) {
                    return violationPatterns.some(pattern => pattern.test(arg.message));
                }
                return false;
            });
        }
        
        // Create filtered console method
        function createFilteredMethod(originalMethod, methodName) {
            return function() {
                const args = Array.prototype.slice.call(arguments);
                
                if (shouldFilterMessage(args)) {
                    return; // Skip completely
                }
                
                return originalMethod.apply(console, args);
            };
        }
        
        // Override all console methods more aggressively
        console.warn = createFilteredMethod(originalConsole.warn, 'warn');
        console.error = createFilteredMethod(originalConsole.error, 'error');
        console.log = createFilteredMethod(originalConsole.log, 'log');
        console.info = createFilteredMethod(originalConsole.info, 'info');
        console.debug = createFilteredMethod(originalConsole.debug, 'debug');
        
        // Intercept console property access
        let consoleIntercepted = false;
        
        // Override the console object itself
        const consoleProxy = new Proxy(console, {
            get: function(target, prop) {
                if (typeof target[prop] === 'function' && ['warn', 'error', 'log', 'info', 'debug'].includes(prop)) {
                    return createFilteredMethod(originalConsole[prop], prop);
                }
                return target[prop];
            },
            set: function(target, prop, value) {
                // Prevent React from overriding our console methods
                if (['warn', 'error', 'log', 'info', 'debug'].includes(prop)) {
                    return true; // Ignore the set operation
                }
                target[prop] = value;
                return true;
            }
        });
        
        // Replace window.console with our proxy
        try {
            Object.defineProperty(window, 'console', {
                get: function() {
                    return consoleProxy;
                },
                set: function(newConsole) {
                    // Ignore attempts to replace console
                    return true;
                },
                configurable: false
            });
        } catch (e) {
            // Fallback if we can't redefine console
            window.console = consoleProxy;
        }
        
        // Also intercept any direct calls to the original console
        ['warn', 'error', 'log', 'info', 'debug'].forEach(method => {
            if (originalConsole[method]) {
                const originalMethod = originalConsole[method];
                originalConsole[method] = createFilteredMethod(originalMethod, method);
            }
        });
        
        // Store originals for debugging
        window.__originalConsole = originalConsole;
        
        // Intercept React DevTools and scheduler
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
            
            // Disable performance profiling
            hook.onCommitFiberRoot = () => {};
            hook.onCommitFiberUnmount = () => {};
            
            // Disable scheduler profiling
            if (hook.onSchedulerProfilerStart) {
                hook.onSchedulerProfilerStart = () => {};
            }
            if (hook.onSchedulerProfilerStop) {
                hook.onSchedulerProfilerStop = () => {};
            }
        }
        
        // Intercept performance API to prevent violation logging
        if (window.performance && window.performance.mark) {
            const originalMark = window.performance.mark;
            const originalMeasure = window.performance.measure;
            
            window.performance.mark = function(name) {
                // Skip React performance marks that might trigger violations
                if (name && (name.includes('React') || name.includes('scheduler'))) {
                    return;
                }
                return originalMark.call(this, name);
            };
            
            window.performance.measure = function(name, startMark, endMark) {
                // Skip React performance measures
                if (name && (name.includes('React') || name.includes('scheduler'))) {
                    return;
                }
                return originalMeasure.call(this, name, startMark, endMark);
            };
        }
        
        console.log('🚀 Aggressive performance violation filter active');
    }
})();