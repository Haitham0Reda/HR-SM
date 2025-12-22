/**
 * Frontend Security Detection Service
 * Detects and reports security threats on the client side
 * Integrates with the enhanced frontend logger for comprehensive security monitoring
 */

import logger from '../utils/logger';

class FrontendSecurityDetectionService {
    constructor() {
        this.isInitialized = false;
        this.detectionEnabled = true;
        this.securityEvents = [];
        this.maxSecurityEvents = 100;
        this.clientFingerprint = null;
        this.suspiciousActivityThresholds = {
            rapidRequests: { count: 20, timeWindow: 10000 }, // 20 requests in 10 seconds
            rapidClicks: { count: 15, timeWindow: 5000 }, // 15 clicks in 5 seconds
            rapidNavigation: { count: 10, timeWindow: 3000 }, // 10 navigations in 3 seconds
            suspiciousPatterns: { count: 5, timeWindow: 60000 } // 5 suspicious patterns in 1 minute
        };

        // Activity tracking
        this.activityCounters = {
            requests: [],
            clicks: [],
            navigations: [],
            suspiciousPatterns: []
        };

        // XSS and injection patterns
        this.xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>/gi,
            /eval\s*\(/gi,
            /document\.write/gi,
            /innerHTML\s*=/gi,
            /outerHTML\s*=/gi,
            /document\.cookie/gi,
            /window\.location/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi,
            /<link[^>]*>/gi,
            /<meta[^>]*>/gi
        ];

        // Script injection patterns
        this.injectionPatterns = [
            /\balert\s*\(/gi,
            /\bconfirm\s*\(/gi,
            /\bprompt\s*\(/gi,
            /String\.fromCharCode/gi,
            /unescape\s*\(/gi,
            /decodeURI\s*\(/gi,
            /decodeURIComponent\s*\(/gi,
            /atob\s*\(/gi,
            /btoa\s*\(/gi,
            /Function\s*\(/gi,
            /setTimeout\s*\(/gi,
            /setInterval\s*\(/gi
        ];

        // Suspicious URL patterns
        this.suspiciousUrlPatterns = [
            /data:text\/html/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /file:/gi,
            /ftp:/gi,
            /\.\.\/\.\.\//g, // Directory traversal
            /%2e%2e%2f/gi, // Encoded directory traversal
            /%252e%252e%252f/gi, // Double encoded directory traversal
        ];
    }

    initialize() {
        if (this.isInitialized) return;

        this.generateClientFingerprint();
        this.setupDOMMonitoring();
        this.setupNetworkMonitoring();
        this.setupInputMonitoring();
        this.setupNavigationMonitoring();
        this.setupConsoleMonitoring();
        this.setupDevToolsDetection();
        this.setupIntegrityMonitoring();

        this.isInitialized = true;
        logger.security('Frontend security detection service initialized', {
            fingerprint: this.clientFingerprint,
            thresholds: this.suspiciousActivityThresholds
        });
    }

    generateClientFingerprint() {
        // Generate a unique fingerprint for this client session
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            webgl: this.getWebGLFingerprint(),
            canvas: this.getCanvasFingerprint(),
            fonts: this.getFontFingerprint(),
            plugins: Array.from(navigator.plugins).map(p => p.name),
            timestamp: Date.now()
        };

        // Create hash of fingerprint
        this.clientFingerprint = this.hashFingerprint(fingerprint);

        return this.clientFingerprint;
    }

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return null;

            return {
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER),
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            };
        } catch (error) {
            return null;
        }
    }

    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Security fingerprint test', 2, 2);
            return canvas.toDataURL().substring(0, 50);
        } catch (error) {
            return null;
        }
    }

    getFontFingerprint() {
        const testFonts = ['Arial', 'Helvetica', 'Times', 'Courier', 'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Tahoma'];
        const availableFonts = [];

        for (const font of testFonts) {
            if (this.isFontAvailable(font)) {
                availableFonts.push(font);
            }
        }

        return availableFonts;
    }

    isFontAvailable(fontName) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const baselineText = 'mmmmmmmmmmlli';

        ctx.font = '72px monospace';
        const baselineWidth = ctx.measureText(baselineText).width;

        ctx.font = `72px ${fontName}, monospace`;
        const testWidth = ctx.measureText(baselineText).width;

        return baselineWidth !== testWidth;
    }

    hashFingerprint(fingerprint) {
        const str = JSON.stringify(fingerprint);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    setupDOMMonitoring() {
        // Monitor for DOM manipulation that could indicate XSS
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                this.analyzeDOMMutation(mutation);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'href', 'onclick', 'onload', 'onerror']
        });

        // Monitor for script injection
        document.addEventListener('DOMNodeInserted', (event) => {
            if (event.target.tagName === 'SCRIPT') {
                this.detectScriptInjection(event.target);
            }
        });
    }

    setupNetworkMonitoring() {
        // Monitor fetch requests for suspicious patterns
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            this.analyzeNetworkRequest('fetch', args[0], args[1]);
            return originalFetch(...args);
        };

        // Monitor XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, ...args) {
            frontendSecurityDetectionService.analyzeNetworkRequest('xhr', url, { method });
            return originalXHROpen.call(this, method, url, ...args);
        };
    }

    setupInputMonitoring() {
        // Monitor form inputs for XSS attempts
        document.addEventListener('input', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                this.analyzeUserInput(event.target.value, event.target);
            }
        });

        // Monitor paste events
        document.addEventListener('paste', (event) => {
            const pastedData = event.clipboardData?.getData('text');
            if (pastedData) {
                this.analyzeUserInput(pastedData, event.target, 'paste');
            }
        });
    }

    setupNavigationMonitoring() {
        // Monitor for suspicious navigation patterns
        let navigationCount = 0;
        const navigationTimes = [];

        const trackNavigation = () => {
            const now = Date.now();
            navigationTimes.push(now);
            navigationCount++;

            // Check for rapid navigation
            const recentNavigations = navigationTimes.filter(time => now - time < this.suspiciousActivityThresholds.rapidNavigation.timeWindow);
            if (recentNavigations.length > this.suspiciousActivityThresholds.rapidNavigation.count) {
                this.reportSecurityEvent('suspicious_navigation', {
                    type: 'rapid_navigation',
                    count: recentNavigations.length,
                    timeWindow: this.suspiciousActivityThresholds.rapidNavigation.timeWindow,
                    severity: 'medium'
                });
            }
        };

        // Monitor URL changes
        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                trackNavigation();
                this.analyzeURL(window.location.href);
                currentUrl = window.location.href;
            }
        }, 100);
    }

    setupConsoleMonitoring() {
        // Monitor console for security-related messages
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.log = (...args) => {
            this.analyzeConsoleOutput('log', args);
            return originalConsoleLog.apply(console, args);
        };

        console.error = (...args) => {
            this.analyzeConsoleOutput('error', args);
            return originalConsoleError.apply(console, args);
        };

        console.warn = (...args) => {
            this.analyzeConsoleOutput('warn', args);
            return originalConsoleWarn.apply(console, args);
        };
    }

    setupDevToolsDetection() {
        // Detect if developer tools are open (potential security risk)
        let devtools = { open: false, orientation: null };

        setInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.reportSecurityEvent('devtools_opened', {
                        type: 'developer_tools_detected',
                        severity: 'low',
                        timestamp: Date.now()
                    });
                }
            } else {
                if (devtools.open) {
                    devtools.open = false;
                    this.reportSecurityEvent('devtools_closed', {
                        type: 'developer_tools_closed',
                        severity: 'low',
                        timestamp: Date.now()
                    });
                }
            }
        }, 1000);
    }

    setupIntegrityMonitoring() {
        // Monitor for tampering with critical functions
        const criticalFunctions = [
            'localStorage.setItem',
            'localStorage.getItem',
            'sessionStorage.setItem',
            'sessionStorage.getItem',
            'document.cookie',
            'XMLHttpRequest',
            'fetch'
        ];

        // Store original function references
        this.originalFunctions = new Map();

        // Check integrity periodically
        setInterval(() => {
            this.checkFunctionIntegrity();
        }, 5000);
    }

    analyzeDOMMutation(mutation) {
        if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    this.analyzeElement(node);
                }
            }
        } else if (mutation.type === 'attributes') {
            this.analyzeElementAttributes(mutation.target, mutation.attributeName);
        }
    }

    analyzeElement(element) {
        const tagName = element.tagName?.toLowerCase();

        // Check for suspicious script tags
        if (tagName === 'script') {
            this.detectScriptInjection(element);
        }

        // Check for suspicious iframe tags
        if (tagName === 'iframe') {
            this.analyzeIframe(element);
        }

        // Check for suspicious link tags
        if (tagName === 'link' && element.rel === 'stylesheet') {
            this.analyzeStylesheet(element);
        }

        // Check innerHTML for XSS patterns
        if (element.innerHTML) {
            this.analyzeHTML(element.innerHTML, element);
        }
    }

    analyzeElementAttributes(element, attributeName) {
        const attributeValue = element.getAttribute(attributeName);

        // Check for event handler attributes
        if (attributeName.startsWith('on') && attributeValue) {
            this.reportSecurityEvent('suspicious_event_handler', {
                type: 'event_handler_injection',
                element: element.tagName,
                attribute: attributeName,
                value: attributeValue.substring(0, 100),
                severity: 'high'
            });
        }

        // Check for suspicious src/href attributes
        if ((attributeName === 'src' || attributeName === 'href') && attributeValue) {
            this.analyzeURL(attributeValue, element);
        }
    }

    detectScriptInjection(scriptElement) {
        const src = scriptElement.src;
        const content = scriptElement.textContent || scriptElement.innerHTML;

        if (src) {
            this.analyzeURL(src, scriptElement);
        }

        if (content) {
            // Check for suspicious script content
            for (const pattern of this.injectionPatterns) {
                if (pattern.test(content)) {
                    this.reportSecurityEvent('script_injection', {
                        type: 'malicious_script_content',
                        pattern: pattern.toString(),
                        content: content.substring(0, 200),
                        severity: 'critical'
                    });
                }
            }
        }

        // Check if script was added dynamically (potential XSS)
        if (!scriptElement.hasAttribute('data-original')) {
            this.reportSecurityEvent('dynamic_script', {
                type: 'dynamic_script_injection',
                src: src || 'inline',
                severity: 'high'
            });
        }
    }

    analyzeIframe(iframe) {
        const src = iframe.src;

        if (src) {
            this.analyzeURL(src, iframe);

            // Check for data URLs in iframes (potential XSS)
            if (src.startsWith('data:')) {
                this.reportSecurityEvent('data_url_iframe', {
                    type: 'data_url_in_iframe',
                    src: src.substring(0, 100),
                    severity: 'high'
                });
            }
        }
    }

    analyzeStylesheet(link) {
        const href = link.href;

        if (href) {
            this.analyzeURL(href, link);
        }
    }

    analyzeHTML(html, element) {
        for (const pattern of this.xssPatterns) {
            if (pattern.test(html)) {
                this.reportSecurityEvent('xss_in_html', {
                    type: 'xss_pattern_detected',
                    pattern: pattern.toString(),
                    element: element.tagName,
                    content: html.substring(0, 200),
                    severity: 'high'
                });
            }
        }
    }

    analyzeNetworkRequest(type, url, options = {}) {
        // Track request frequency
        const now = Date.now();
        this.activityCounters.requests.push(now);
        this.activityCounters.requests = this.activityCounters.requests.filter(
            time => now - time < this.suspiciousActivityThresholds.rapidRequests.timeWindow
        );

        // Check for rapid requests
        if (this.activityCounters.requests.length > this.suspiciousActivityThresholds.rapidRequests.count) {
            this.reportSecurityEvent('rapid_requests', {
                type: 'suspicious_request_frequency',
                count: this.activityCounters.requests.length,
                timeWindow: this.suspiciousActivityThresholds.rapidRequests.timeWindow,
                severity: 'medium'
            });
        }

        // Analyze URL for suspicious patterns
        this.analyzeURL(url, null, type);
    }

    analyzeUserInput(input, element, inputType = 'typing') {
        // Check for XSS patterns in user input
        for (const pattern of this.xssPatterns) {
            if (pattern.test(input)) {
                this.reportSecurityEvent('xss_in_input', {
                    type: 'xss_attempt_in_input',
                    inputType,
                    pattern: pattern.toString(),
                    element: element.tagName,
                    elementId: element.id,
                    content: input.substring(0, 100),
                    severity: 'high'
                });
            }
        }

        // Check for script injection patterns
        for (const pattern of this.injectionPatterns) {
            if (pattern.test(input)) {
                this.reportSecurityEvent('script_injection_input', {
                    type: 'script_injection_attempt',
                    inputType,
                    pattern: pattern.toString(),
                    element: element.tagName,
                    elementId: element.id,
                    content: input.substring(0, 100),
                    severity: 'high'
                });
            }
        }
    }

    analyzeURL(url, element = null, context = 'unknown') {
        // Check for suspicious URL patterns
        for (const pattern of this.suspiciousUrlPatterns) {
            if (pattern.test(url)) {
                this.reportSecurityEvent('suspicious_url', {
                    type: 'malicious_url_pattern',
                    url: url.substring(0, 200),
                    pattern: pattern.toString(),
                    context,
                    element: element?.tagName,
                    severity: 'medium'
                });
            }
        }

        // Check for potential phishing domains
        if (this.isPotentialPhishingDomain(url)) {
            this.reportSecurityEvent('phishing_domain', {
                type: 'potential_phishing_domain',
                url: url.substring(0, 200),
                context,
                severity: 'high'
            });
        }
    }

    analyzeConsoleOutput(level, args) {
        const message = args.map(arg => {
            try {
                return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            } catch (e) {
                return String(arg);
            }
        }).join(' ');


        // Check for security-related console messages
        const securityKeywords = [
            'Content Security Policy',
            'Mixed Content',
            'CORS',
            'Cross-Origin',
            'Blocked',
            'Unsafe',
            'eval',
            'script-src',
            'object-src'
        ];

        for (const keyword of securityKeywords) {
            if (message.includes(keyword)) {
                this.reportSecurityEvent('security_console_message', {
                    type: 'security_related_console_output',
                    level,
                    keyword,
                    message: message.substring(0, 200),
                    severity: level === 'error' ? 'medium' : 'low'
                });
            }
        }
    }

    isPotentialPhishingDomain(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.toLowerCase();

            // Check for suspicious domain patterns
            const suspiciousDomainPatterns = [
                /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
                /[a-z0-9]+-[a-z0-9]+-[a-z0-9]+\.(tk|ml|ga|cf)/, // Suspicious TLDs with hyphens
                /(paypal|amazon|google|microsoft|apple|facebook).*\.(tk|ml|ga|cf|xyz)/, // Brand impersonation
                /[0-9]{5,}/, // Long numeric sequences
                /[a-z]{20,}/ // Very long domain names
            ];

            return suspiciousDomainPatterns.some(pattern => pattern.test(domain));
        } catch (error) {
            return false;
        }
    }

    checkFunctionIntegrity() {
        // Check if critical functions have been tampered with
        const currentFetch = window.fetch.toString();
        const currentXHR = XMLHttpRequest.prototype.open.toString();

        // Simple integrity check (in production, use more sophisticated methods)
        if (!currentFetch.includes('native code') && !this.originalFunctions.has('fetch')) {
            this.reportSecurityEvent('function_tampering', {
                type: 'fetch_function_modified',
                severity: 'high'
            });
        }

        if (!currentXHR.includes('native code') && !this.originalFunctions.has('xhr')) {
            this.reportSecurityEvent('function_tampering', {
                type: 'xhr_function_modified',
                severity: 'high'
            });
        }
    }

    reportSecurityEvent(eventType, details) {
        if (!this.detectionEnabled) return;

        const securityEvent = {
            id: this.generateEventId(),
            type: eventType,
            timestamp: Date.now(),
            fingerprint: this.clientFingerprint,
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...details
        };

        // Add to security events queue
        this.securityEvents.push(securityEvent);
        if (this.securityEvents.length > this.maxSecurityEvents) {
            this.securityEvents.shift();
        }

        // Log security event
        logger.security(`Frontend Security Event: ${eventType}`, {
            eventType: logger.SECURITY_EVENT_TYPES.XSS_ATTEMPT,
            securityEvent,
            actionType: 'security_detection'
        });

        // Immediate action for critical events
        if (details.severity === 'critical') {
            this.handleCriticalSecurityEvent(securityEvent);
        }
    }

    handleCriticalSecurityEvent(event) {
        // Take immediate action for critical security events
        logger.error(`CRITICAL SECURITY EVENT: ${event.type}`, {
            securityEvent: event,
            actionType: 'critical_security_event'
        });

        // Could implement additional actions like:
        // - Disable certain functionality
        // - Redirect to security page
        // - Clear sensitive data
        // - Block further actions
    }

    generateEventId() {
        return 'sec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }

    getSecurityStats() {
        const eventsByType = {};
        const eventsBySeverity = {};

        for (const event of this.securityEvents) {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
            eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        }

        return {
            totalEvents: this.securityEvents.length,
            eventsByType,
            eventsBySeverity,
            recentEvents: this.securityEvents.slice(-10),
            clientFingerprint: this.clientFingerprint,
            detectionEnabled: this.detectionEnabled
        };
    }

    setDetectionEnabled(enabled) {
        this.detectionEnabled = enabled;
        logger.info(`Frontend security detection ${enabled ? 'enabled' : 'disabled'}`);
    }

    clearSecurityEvents() {
        this.securityEvents = [];
        logger.info('Frontend security events cleared');
    }

    exportSecurityData() {
        return {
            events: this.securityEvents,
            stats: this.getSecurityStats(),
            fingerprint: this.clientFingerprint,
            thresholds: this.suspiciousActivityThresholds
        };
    }
}

// Create singleton instance
const frontendSecurityDetectionService = new FrontendSecurityDetectionService();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
    frontendSecurityDetectionService.initialize();
}

export default frontendSecurityDetectionService;