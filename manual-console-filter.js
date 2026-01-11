// Manual Console Filter for Performance Violations
// Copy and paste this into your browser's DevTools console to filter violations

(function() {
    console.log('🔧 Installing manual performance violation filter...');
    
    // Store original console methods
    const original = {
        warn: console.warn,
        error: console.error,
        log: console.log,
        info: console.info,
        debug: console.debug
    };
    
    // Violation patterns to filter
    const patterns = [
        /\[Violation\]/,
        /handler took \d+ms/,
        /Forced reflow/,
        /loadend.*handler took/,
        /message.*handler took/,
        /scheduler\.development\.js/,
        /react-dom-client\.development\.js/
    ];
    
    // Filter function
    function shouldFilter(args) {
        return args.some(arg => {
            if (typeof arg === 'string') {
                return patterns.some(pattern => pattern.test(arg));
            }
            return false;
        });
    }
    
    // Override console methods
    console.warn = function(...args) {
        if (!shouldFilter(args)) {
            return original.warn.apply(console, args);
        }
    };
    
    console.error = function(...args) {
        if (!shouldFilter(args)) {
            return original.error.apply(console, args);
        }
    };
    
    console.log = function(...args) {
        if (!shouldFilter(args)) {
            return original.log.apply(console, args);
        }
    };
    
    console.info = function(...args) {
        if (!shouldFilter(args)) {
            return original.info.apply(console, args);
        }
    };
    
    console.debug = function(...args) {
        if (!shouldFilter(args)) {
            return original.debug.apply(console, args);
        }
    };
    
    // Store originals for restoration
    window.__restoreConsole = function() {
        console.warn = original.warn;
        console.error = original.error;
        console.log = original.log;
        console.info = original.info;
        console.debug = original.debug;
        console.log('Console restored to original state');
    };
    
    console.log('✅ Manual performance violation filter installed!');
    console.log('💡 Run window.__restoreConsole() to restore original console');
})();