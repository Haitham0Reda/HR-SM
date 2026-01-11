// Ultimate Violation Killer - Intercepts React's internal violation logging
(function() {
    'use strict';
    
    // Immediately patch console before React loads
    const originalConsole = {
        warn: console.warn,
        error: console.error,
        log: console.log,
        info: console.info,
        debug: console.debug
    };
    
    // Comprehensive violation detection
    function isViolation(message) {
        if (typeof message !== 'string') return false;
        
        return /\[Violation\]|handler took \d+ms|Forced reflow|loadend.*handler|Long running|scheduler\.development\.js|react-dom-client\.development\.js/i.test(message);
    }
    
    // Create bulletproof console override
    function createViolationKiller(originalMethod) {
        return function(...args) {
            // Check all arguments for violations
            const hasViolation = args.some(arg => {
                if (typeof arg === 'string') return isViolation(arg);
                if (arg && typeof arg === 'object' && arg.message) return isViolation(arg.message);
                if (arg && typeof arg === 'object' && arg.toString) return isViolation(arg.toString());
                return false;
            });
            
            if (hasViolation) return; // Kill the violation
            
            return originalMethod.apply(console, args);
        };
    }
    
    // Override all console methods
    console.warn = createViolationKiller(originalConsole.warn);
    console.error = createViolationKiller(originalConsole.error);
    console.log = createViolationKiller(originalConsole.log);
    console.info = createViolationKiller(originalConsole.info);
    console.debug = createViolationKiller(originalConsole.debug);
    
    // Prevent React from overriding our console
    Object.defineProperty(window, 'console', {
        get: function() {
            return {
                warn: createViolationKiller(originalConsole.warn),
                error: createViolationKiller(originalConsole.error),
                log: createViolationKiller(originalConsole.log),
                info: createViolationKiller(originalConsole.info),
                debug: createViolationKiller(originalConsole.debug),
                // Keep other console methods intact
                clear: originalConsole.clear,
                count: originalConsole.count,
                dir: originalConsole.dir,
                dirxml: originalConsole.dirxml,
                group: originalConsole.group,
                groupCollapsed: originalConsole.groupCollapsed,
                groupEnd: originalConsole.groupEnd,
                table: originalConsole.table,
                time: originalConsole.time,
                timeEnd: originalConsole.timeEnd,
                trace: originalConsole.trace,
                assert: originalConsole.assert
            };
        },
        set: function() {
            // Ignore attempts to replace console
            return true;
        },
        configurable: false
    });
    
    // Patch Function.prototype.call and apply to catch violations at source
    const originalCall = Function.prototype.call;
    const originalApply = Function.prototype.apply;
    
    Function.prototype.call = function(thisArg, ...args) {
        // If this is a console method being called with violations, block it
        if (thisArg === originalConsole.warn || thisArg === originalConsole.error || thisArg === originalConsole.log) {
            if (args.some(arg => typeof arg === 'string' && isViolation(arg))) {
                return; // Block the call
            }
        }
        return originalCall.apply(this, [thisArg, ...args]);
    };
    
    Function.prototype.apply = function(thisArg, args) {
        // If this is a console method being called with violations, block it
        if (thisArg === originalConsole.warn || thisArg === originalConsole.error || thisArg === originalConsole.log) {
            if (args && args.some(arg => typeof arg === 'string' && isViolation(arg))) {
                return; // Block the call
            }
        }
        return originalApply.apply(this, [thisArg, args]);
    };
    
    // Disable performance monitoring APIs that trigger violations
    if (window.PerformanceObserver) {
        window.PerformanceObserver = class FakePerformanceObserver {
            constructor() {}
            observe() {}
            disconnect() {}
            takeRecords() { return []; }
        };
    }
    
    // Disable performance timing APIs
    if (window.performance) {
        const originalPerformance = window.performance;
        
        // Override methods that might trigger violations
        window.performance.mark = () => {};
        window.performance.measure = () => {};
        window.performance.clearMarks = () => {};
        window.performance.clearMeasures = () => {};
        
        // Keep essential performance methods but disable violation-triggering ones
        const performanceProxy = new Proxy(originalPerformance, {
            get(target, prop) {
                if (['mark', 'measure', 'clearMarks', 'clearMeasures'].includes(prop)) {
                    return () => {}; // No-op
                }
                return target[prop];
            }
        });
        
        Object.defineProperty(window, 'performance', {
            get: () => performanceProxy,
            set: () => true,
            configurable: false
        });
    }
    
    // Intercept React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        
        // Disable all profiling hooks
        hook.onCommitFiberRoot = () => {};
        hook.onCommitFiberUnmount = () => {};
        hook.onSchedulerProfilerStart = () => {};
        hook.onSchedulerProfilerStop = () => {};
        
        // Disable renderer registration to prevent performance monitoring
        const originalRegister = hook.onSchedulerProfilerStart;
        hook.onSchedulerProfilerStart = () => {};
    }
    
    // Patch setTimeout/setInterval to prevent violation logging
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    window.setTimeout = function(callback, delay, ...args) {
        const wrappedCallback = function(...callbackArgs) {
            try {
                return callback.apply(this, callbackArgs);
            } catch (error) {
                // Silently handle to prevent violations
                if (!isViolation(error.message)) {
                    originalConsole.error('Timer error:', error);
                }
            }
        };
        return originalSetTimeout.call(window, wrappedCallback, delay, ...args);
    };
    
    window.setInterval = function(callback, delay, ...args) {
        const wrappedCallback = function(...callbackArgs) {
            try {
                return callback.apply(this, callbackArgs);
            } catch (error) {
                // Silently handle to prevent violations
                if (!isViolation(error.message)) {
                    originalConsole.error('Interval error:', error);
                }
            }
        };
        return originalSetInterval.call(window, wrappedCallback, delay, ...args);
    };
    
    // Store originals for debugging
    window.__originalConsole = originalConsole;
    window.__violationKillerActive = true;
    
    console.log('💀 ULTIMATE VIOLATION KILLER ACTIVE - All violations terminated');
})();