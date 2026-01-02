/**
 * JSON Error Handler Middleware
 * 
 * Catches JSON parsing errors and provides better error messages
 * Helps debug malformed JSON requests
 */

/**
 * Middleware to handle JSON parsing errors
 */
export const jsonErrorHandler = (err, req, res, next) => {
    // Check if this is a JSON parsing error
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('🚨 JSON Parsing Error Details:');
        console.error('URL:', req.method, req.originalUrl);
        console.error('Content-Type:', req.get('Content-Type'));
        console.error('Content-Length:', req.get('Content-Length'));
        console.error('User-Agent:', req.get('User-Agent'));
        console.error('Error Message:', err.message);
        
        // Try to log the raw body if available
        if (err.body) {
            console.error('Raw Body (first 100 chars):', String(err.body).substring(0, 100));
        }
        
        // Check for common patterns that cause issues
        const bodyStr = String(err.body || '');
        let suggestion = '';
        
        if (bodyStr.startsWith('{\\')) {
            suggestion = ' This looks like unescaped backslashes in JSON. Check frontend input sanitization.';
        } else if (bodyStr.includes('"\\')) {
            suggestion = ' This looks like improperly escaped quotes. Check string escaping in frontend.';
        } else if (bodyStr.includes('\n') || bodyStr.includes('\r')) {
            suggestion = ' This looks like unescaped newlines. Check multiline input handling.';
        }
        
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON format',
            message: `The request body contains malformed JSON.${suggestion}`,
            details: process.env.NODE_ENV === 'development' ? {
                originalError: err.message,
                position: err.message.match(/position (\d+)/)?.[1],
                suggestion: suggestion.trim()
            } : undefined
        });
    }
    
    // Pass other errors to the next error handler
    next(err);
};

/**
 * Middleware to log request bodies for debugging (development only)
 */
export const requestBodyLogger = (req, res, next) => {
    // Only in development mode
    if (process.env.NODE_ENV !== 'development') {
        return next();
    }
    
    // Only log POST/PUT/PATCH requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
    }
    
    // Only log JSON requests
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
        return next();
    }
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        // Check for potentially problematic patterns
        const problematicPatterns = [
            { pattern: /^{\\/, name: 'Starts with malformed JSON' },
            { pattern: /\\$/, name: 'Ends with unescaped backslash' },
            { pattern: /[^\x20-\x7E\u00A0-\uFFFF]/, name: 'Contains non-printable characters' },
            { pattern: /"[^"]*\\[^"]*"/, name: 'Contains unescaped backslashes in strings' }
        ];
        
        const issues = problematicPatterns.filter(p => p.pattern.test(body));
        
        if (issues.length > 0) {
            console.warn('⚠️  Potentially problematic request body detected:');
            console.warn('URL:', req.method, req.originalUrl);
            console.warn('Issues found:', issues.map(i => i.name).join(', '));
            console.warn('Body preview:', body.substring(0, 200));
        }
    });
    
    next();
};

export default {
    jsonErrorHandler,
    requestBodyLogger
};