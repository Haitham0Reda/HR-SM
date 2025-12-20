/**
 * Automatic Error Capture Service
 * Provides comprehensive error tracking and context collection
 * Integrates with the enhanced frontend logger
 */

import logger from '../utils/logger';

class ErrorCaptureService {
    constructor() {
        this.isInitialized = false;
        this.errorQueue = [];
        this.maxErrorQueue = 50;
        this.errorPatterns = new Map();
        this.contextCollectors = [];
        this.errorFilters = [];
        
        // Error classification patterns
        this.setupErrorClassification();
    }

    initialize() {
        if (this.isInitialized) return;
        
        this.setupGlobalErrorHandlers();
        this.setupReactErrorBoundary();
        this.setupNetworkErrorCapture();
        this.setupResourceErrorCapture();
        this.setupConsoleErrorCapture();
        
        this.isInitialized = true;
        logger.info('Error capture service initialized');
    }

    setupErrorClassification() {
        // Network errors
        this.errorPatterns.set('network', [
            /NetworkError/i,
            /Failed to fetch/i,
            /ERR_NETWORK/i,
            /ERR_INTERNET_DISCONNECTED/i,
            /timeout/i
        ]);
        
        // JavaScript errors
        this.errorPatterns.set('javascript', [
            /ReferenceError/i,
            /TypeError/i,
            /SyntaxError/i,
            /RangeError/i,
            /EvalError/i
        ]);
        
        // React errors
        this.errorPatterns.set('react', [
            /React/i,
            /Component/i,
            /Hook/i,
            /render/i,
            /setState/i
        ]);
        
        // Security-related errors
        this.errorPatterns.set('security', [
            /Content Security Policy/i,
            /Mixed Content/i,
            /CORS/i,
            /Cross-Origin/i,
            /Blocked/i
        ]);
        
        // Performance errors
        this.errorPatterns.set('performance', [
            /Memory/i,
            /Quota/i,
            /Storage/i,
            /Timeout/i
        ]);
    }

    classifyError(error) {
        const errorMessage = error.message || error.toString();
        
        for (const [category, patterns] of this.errorPatterns) {
            for (const pattern of patterns) {
                if (pattern.test(errorMessage)) {
                    return category;
                }
            }
        }
        
        return 'unknown';
    }

    setupGlobalErrorHandlers() {
        // JavaScript errors
        window.addEventListener('error', (event) => {
            this.captureError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                error: event.error
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError({
                type: 'promise_rejection',
                message: 'Unhandled Promise Rejection',
                reason: event.reason,
                stack: event.reason?.stack,
                error: event.reason
            });
        });
    }

    setupReactErrorBoundary() {
        // Create a global React error boundary component
        window.ReactErrorBoundary = class extends React.Component {
            constructor(props) {
                super(props);
                this.state = { hasError: false };
            }

            static getDerivedStateFromError(error) {
                return { hasError: true };
            }

            componentDidCatch(error, errorInfo) {
                errorCaptureService.captureError({
                    type: 'react_error',
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    error: error,
                    errorInfo: errorInfo
                });
            }

            render() {
                if (this.state.hasError) {
                    return this.props.fallback || React.createElement('div', {
                        style: { padding: '20px', textAlign: 'center' }
                    }, 'Something went wrong. Please refresh the page.');
                }

                return this.props.children;
            }
        };
    }

    setupNetworkErrorCapture() {
        // Intercept fetch errors
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // Log failed HTTP responses
                if (!response.ok) {
                    this.captureError({
                        type: 'network_error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText,
                        method: args[1]?.method || 'GET'
                    });
                }
                
                return response;
            } catch (error) {
                this.captureError({
                    type: 'network_error',
                    message: error.message,
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    error: error
                });
                throw error;
            }
        };

        // Intercept XMLHttpRequest errors
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._method = method;
            this._url = url;
            return originalXHROpen.call(this, method, url, ...args);
        };
        
        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('error', () => {
                errorCaptureService.captureError({
                    type: 'xhr_error',
                    message: 'XMLHttpRequest failed',
                    method: this._method,
                    url: this._url,
                    status: this.status,
                    statusText: this.statusText
                });
            });
            
            this.addEventListener('timeout', () => {
                errorCaptureService.captureError({
                    type: 'xhr_timeout',
                    message: 'XMLHttpRequest timeout',
                    method: this._method,
                    url: this._url,
                    timeout: this.timeout
                });
            });
            
            return originalXHRSend.call(this, ...args);
        };
    }

    setupResourceErrorCapture() {
        // Capture resource loading errors (images, scripts, stylesheets)
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.captureError({
                    type: 'resource_error',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    resourceType: event.target.tagName.toLowerCase(),
                    resourceUrl: event.target.src || event.target.href,
                    element: {
                        tagName: event.target.tagName,
                        id: event.target.id,
                        className: event.target.className
                    }
                });
            }
        }, true);
    }

    setupConsoleErrorCapture() {
        // Intercept console.error calls
        const originalConsoleError = console.error;
        console.error = (...args) => {
            // Check if this is a React error or other framework error
            const errorMessage = args.join(' ');
            
            if (this.shouldCaptureConsoleError(errorMessage)) {
                this.captureError({
                    type: 'console_error',
                    message: errorMessage,
                    arguments: args,
                    stack: new Error().stack
                });
            }
            
            return originalConsoleError.apply(console, args);
        };
    }

    shouldCaptureConsoleError(message) {
        // Filter out known non-critical console errors
        const ignoredPatterns = [
            /Warning: /i,
            /DevTools/i,
            /Extension/i
        ];
        
        return !ignoredPatterns.some(pattern => pattern.test(message));
    }

    addContextCollector(collector) {
        this.contextCollectors.push(collector);
    }

    addErrorFilter(filter) {
        this.errorFilters.push(filter);
    }

    collectErrorContext() {
        const context = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null,
            localStorage: this.getLocalStorageInfo(),
            sessionStorage: this.getSessionStorageInfo(),
            cookies: document.cookie ? document.cookie.split(';').length : 0
        };

        // Collect additional context from registered collectors
        for (const collector of this.contextCollectors) {
            try {
                const additionalContext = collector();
                Object.assign(context, additionalContext);
            } catch (error) {
                console.warn('Error in context collector:', error);
            }
        }

        return context;
    }

    getLocalStorageInfo() {
        try {
            const keys = Object.keys(localStorage);
            return {
                itemCount: keys.length,
                keys: keys.slice(0, 10), // Only first 10 keys for privacy
                approximateSize: JSON.stringify(localStorage).length
            };
        } catch (error) {
            return { error: 'Unable to access localStorage' };
        }
    }

    getSessionStorageInfo() {
        try {
            const keys = Object.keys(sessionStorage);
            return {
                itemCount: keys.length,
                keys: keys.slice(0, 10), // Only first 10 keys for privacy
                approximateSize: JSON.stringify(sessionStorage).length
            };
        } catch (error) {
            return { error: 'Unable to access sessionStorage' };
        }
    }

    captureError(errorData) {
        try {
            // Apply error filters
            for (const filter of this.errorFilters) {
                if (!filter(errorData)) {
                    return; // Error filtered out
                }
            }

            // Classify the error
            const category = this.classifyError(errorData);
            
            // Collect comprehensive context
            const context = this.collectErrorContext();
            
            // Create enhanced error object
            const enhancedError = {
                ...errorData,
                category,
                context,
                id: this.generateErrorId(),
                fingerprint: this.generateErrorFingerprint(errorData),
                severity: this.calculateErrorSeverity(errorData, category),
                breadcrumbs: this.getBreadcrumbs()
            };

            // Add to error queue
            this.errorQueue.push(enhancedError);
            if (this.errorQueue.length > this.maxErrorQueue) {
                this.errorQueue.shift();
            }

            // Log using the enhanced logger
            logger.error(`${category.toUpperCase()} Error: ${errorData.message}`, {
                errorCapture: true,
                errorData: enhancedError,
                actionType: 'error_capture'
            });

        } catch (captureError) {
            console.error('Error in error capture service:', captureError);
        }
    }

    generateErrorId() {
        return 'err_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateErrorFingerprint(errorData) {
        // Create a fingerprint to group similar errors
        const key = `${errorData.type}_${errorData.message}_${errorData.filename || ''}_${errorData.lineno || ''}`;
        return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
    }

    calculateErrorSeverity(errorData, category) {
        // Calculate error severity based on type and context
        if (category === 'security') return 'critical';
        if (errorData.type === 'javascript_error' && errorData.message.includes('Cannot read property')) return 'high';
        if (category === 'network' && errorData.status >= 500) return 'high';
        if (category === 'react') return 'medium';
        if (category === 'performance') return 'medium';
        return 'low';
    }

    getBreadcrumbs() {
        // Get recent user actions as breadcrumbs
        const stats = logger.getStats();
        return {
            sessionId: stats.sessionId,
            correlationId: stats.correlationId,
            userContext: stats.userContext,
            companyContext: stats.companyContext
        };
    }

    getErrorStats() {
        const errorsByCategory = {};
        const errorsByType = {};
        
        for (const error of this.errorQueue) {
            errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
        }
        
        return {
            totalErrors: this.errorQueue.length,
            errorsByCategory,
            errorsByType,
            recentErrors: this.errorQueue.slice(-5)
        };
    }

    clearErrorQueue() {
        this.errorQueue = [];
    }
}

// Create singleton instance
const errorCaptureService = new ErrorCaptureService();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
    errorCaptureService.initialize();
}

export default errorCaptureService;