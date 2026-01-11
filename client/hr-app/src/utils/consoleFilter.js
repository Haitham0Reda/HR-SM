/**
 * Console Filter Utility
 * Advanced filtering for performance violations
 */

// Run immediately when imported
(function() {
    if (typeof window === 'undefined' || !window.console) return;

    // Store original methods
    const originalMethods = {
        warn: console.warn,
        error: console.error,
        log: console.log,
        info: console.info,
        debug: console.debug
    };

    // Performance violation patterns
    const violationPatterns = [
        /\[Violation\]/i,
        /handler took \d+ms/i,
        /Forced reflow/i,
        /loadend.*handler took/i,
        /Long running/i,
        /react-dom-client\.development\.js/i,
        /message.*handler took/i
    ];

    // Check if message should be filtered
    function shouldFilter(message) {
        if (typeof message !== 'string') return false;
        return violationPatterns.some(pattern => pattern.test(message));
    }

    // Create filtered console method
    function createFilteredMethod(originalMethod) {
        return function(...args) {
            // Check first argument (usually the message)
            if (args.length > 0 && shouldFilter(args[0])) {
                return; // Skip this log
            }
            
            // Check if any argument contains violation text
            const hasViolation = args.some(arg => 
                typeof arg === 'string' && shouldFilter(arg)
            );
            
            if (hasViolation) {
                return; // Skip this log
            }
            
            return originalMethod.apply(console, args);
        };
    }

    // Override all console methods
    console.warn = createFilteredMethod(originalMethods.warn);
    console.error = createFilteredMethod(originalMethods.error);
    console.log = createFilteredMethod(originalMethods.log);
    console.info = createFilteredMethod(originalMethods.info);
    console.debug = createFilteredMethod(originalMethods.debug);

    // Expose original methods for debugging if needed
    window.__originalConsole = originalMethods;

    // Intercept React DevTools console calls
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        
        // Disable performance profiling
        if (hook.onCommitFiberRoot) {
            hook.onCommitFiberRoot = () => {};
        }
        
        if (hook.onCommitFiberUnmount) {
            hook.onCommitFiberUnmount = () => {};
        }
    }

    console.log('🔇 Console filter loaded - performance violations suppressed');
})();

export default {};