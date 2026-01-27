/**
 * HTTPS Enforcement Middleware Tests
 * 
 * Tests for HTTPS enforcement and SSL certificate validation
 * Requirement: 8.5 - Use encrypted connections (HTTPS) for sensitive data
 */

import { jest } from '@jest/globals';
import {
    enforceHTTPS,
    setSecurityHeaders,
    validateSSLCertificate,
    isHTTPS,
    logHTTPSStatus
} from '../middleware/httpsEnforcement.middleware.js';

describe('HTTPS Enforcement Middleware', () => {
    let req, res, next;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            secure: false,
            hostname: 'example.com',
            url: '/api/tenants',
            path: '/api/tenants',
            method: 'GET',
            headers: {},
            ip: '127.0.0.1',
            socket: {
                getPeerCertificate: jest.fn()
            }
        };
        
        res = {
            redirect: jest.fn(),
            setHeader: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        next = jest.fn();
    });
    
    describe('enforceHTTPS - Requirement 8.5', () => {
        it('should redirect HTTP to HTTPS when enabled', () => {
            const middleware = enforceHTTPS({ enabled: true });
            
            middleware(req, res, next);
            
            expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/tenants');
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should use 307 redirect for non-GET/HEAD methods', () => {
            req.method = 'POST';
            
            const middleware = enforceHTTPS({ enabled: true });
            middleware(req, res, next);
            
            expect(res.redirect).toHaveBeenCalledWith(307, 'https://example.com/api/tenants');
        });
        
        it('should not redirect when request is already secure', () => {
            req.secure = true;
            
            const middleware = enforceHTTPS({ enabled: true });
            middleware(req, res, next);
            
            expect(res.redirect).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
        
        it('should trust X-Forwarded-Proto header when trustProxy is true', () => {
            req.headers['x-forwarded-proto'] = 'https';
            
            const middleware = enforceHTTPS({ enabled: true, trustProxy: true });
            middleware(req, res, next);
            
            expect(res.redirect).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
        
        it('should not trust X-Forwarded-Proto when trustProxy is false', () => {
            req.headers['x-forwarded-proto'] = 'https';
            
            const middleware = enforceHTTPS({ enabled: true, trustProxy: false });
            middleware(req, res, next);
            
            expect(res.redirect).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should skip enforcement when disabled', () => {
            const middleware = enforceHTTPS({ enabled: false });
            
            middleware(req, res, next);
            
            expect(res.redirect).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
        
        it('should skip enforcement for excluded paths', () => {
            req.path = '/health';
            
            const middleware = enforceHTTPS({ 
                enabled: true,
                excludePaths: ['/health']
            });
            
            middleware(req, res, next);
            
            expect(res.redirect).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
        
        it('should enforce HTTPS for non-excluded paths', () => {
            req.path = '/api/tenants';
            
            const middleware = enforceHTTPS({ 
                enabled: true,
                excludePaths: ['/health']
            });
            
            middleware(req, res, next);
            
            expect(res.redirect).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should default to enabled in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            const middleware = enforceHTTPS();
            middleware(req, res, next);
            
            expect(res.redirect).toHaveBeenCalled();
            
            process.env.NODE_ENV = originalEnv;
        });
    });
    
    describe('setSecurityHeaders', () => {
        it('should set HSTS header for HTTPS requests', () => {
            req.secure = true;
            
            const middleware = setSecurityHeaders();
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith(
                'Strict-Transport-Security',
                expect.stringContaining('max-age=31536000')
            );
            expect(next).toHaveBeenCalled();
        });
        
        it('should include includeSubDomains in HSTS header', () => {
            req.secure = true;
            
            const middleware = setSecurityHeaders({ includeSubDomains: true });
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith(
                'Strict-Transport-Security',
                expect.stringContaining('includeSubDomains')
            );
        });
        
        it('should include preload in HSTS header', () => {
            req.secure = true;
            
            const middleware = setSecurityHeaders({ preload: true });
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith(
                'Strict-Transport-Security',
                expect.stringContaining('preload')
            );
        });
        
        it('should set custom max-age', () => {
            req.secure = true;
            
            const middleware = setSecurityHeaders({ maxAge: 86400 });
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith(
                'Strict-Transport-Security',
                expect.stringContaining('max-age=86400')
            );
        });
        
        it('should not set HSTS header for HTTP requests', () => {
            req.secure = false;
            
            const middleware = setSecurityHeaders();
            middleware(req, res, next);
            
            const hstsCall = res.setHeader.mock.calls.find(
                call => call[0] === 'Strict-Transport-Security'
            );
            expect(hstsCall).toBeUndefined();
        });
        
        it('should set HSTS header when X-Forwarded-Proto is https', () => {
            req.headers['x-forwarded-proto'] = 'https';
            
            const middleware = setSecurityHeaders();
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith(
                'Strict-Transport-Security',
                expect.any(String)
            );
        });
        
        it('should set X-Content-Type-Options header', () => {
            const middleware = setSecurityHeaders();
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        });
        
        it('should set X-Frame-Options header', () => {
            const middleware = setSecurityHeaders();
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
        });
        
        it('should set X-XSS-Protection header', () => {
            const middleware = setSecurityHeaders();
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
        });
        
        it('should set Referrer-Policy header', () => {
            const middleware = setSecurityHeaders();
            middleware(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
        });
    });
    
    describe('validateSSLCertificate', () => {
        it('should pass when client certificate not required', () => {
            const middleware = validateSSLCertificate({ requireClientCert: false });
            
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should return 401 when client certificate required but not provided', () => {
            req.socket.getPeerCertificate.mockReturnValue({});
            
            const middleware = validateSSLCertificate({ requireClientCert: true });
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'CLIENT_CERTIFICATE_REQUIRED',
                    statusCode: 401
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should return 401 when client certificate is invalid', () => {
            req.socket.getPeerCertificate.mockReturnValue({
                // Missing subject and issuer
                fingerprint: 'abc123'
            });
            
            const middleware = validateSSLCertificate({ requireClientCert: true });
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.objectContaining({
                    code: 'INVALID_CLIENT_CERTIFICATE',
                    statusCode: 401
                })
            });
            expect(next).not.toHaveBeenCalled();
        });
        
        it('should pass when valid client certificate provided', () => {
            req.socket.getPeerCertificate.mockReturnValue({
                subject: { CN: 'client.example.com' },
                issuer: { CN: 'CA' },
                valid_from: '2024-01-01',
                valid_to: '2025-01-01',
                fingerprint: 'abc123'
            });
            
            const middleware = validateSSLCertificate({ requireClientCert: true });
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(req.clientCert).toBeDefined();
            expect(req.clientCert.subject.CN).toBe('client.example.com');
        });
        
        it('should attach certificate info to request', () => {
            const mockCert = {
                subject: { CN: 'client.example.com' },
                issuer: { CN: 'CA' },
                valid_from: '2024-01-01',
                valid_to: '2025-01-01',
                fingerprint: 'abc123'
            };
            
            req.socket.getPeerCertificate.mockReturnValue(mockCert);
            
            const middleware = validateSSLCertificate({ requireClientCert: true });
            middleware(req, res, next);
            
            expect(req.clientCert).toEqual({
                subject: mockCert.subject,
                issuer: mockCert.issuer,
                valid_from: mockCert.valid_from,
                valid_to: mockCert.valid_to,
                fingerprint: mockCert.fingerprint
            });
        });
    });
    
    describe('isHTTPS utility', () => {
        it('should return true when req.secure is true', () => {
            req.secure = true;
            expect(isHTTPS(req)).toBe(true);
        });
        
        it('should return true when X-Forwarded-Proto is https and trustProxy is true', () => {
            req.headers['x-forwarded-proto'] = 'https';
            expect(isHTTPS(req, true)).toBe(true);
        });
        
        it('should return false when X-Forwarded-Proto is https but trustProxy is false', () => {
            req.headers['x-forwarded-proto'] = 'https';
            expect(isHTTPS(req, false)).toBe(false);
        });
        
        it('should return false when request is not secure', () => {
            expect(isHTTPS(req)).toBe(false);
        });
        
        it('should return false when X-Forwarded-Proto is http', () => {
            req.headers['x-forwarded-proto'] = 'http';
            expect(isHTTPS(req, true)).toBe(false);
        });
    });
    
    describe('logHTTPSStatus', () => {
        let consoleLogSpy;
        
        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        });
        
        afterEach(() => {
            consoleLogSpy.mockRestore();
        });
        
        it('should log HTTPS for secure requests', () => {
            req.secure = true;
            
            const middleware = logHTTPSStatus();
            middleware(req, res, next);
            
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('HTTPS')
            );
            expect(next).toHaveBeenCalled();
        });
        
        it('should log HTTP for insecure requests', () => {
            const middleware = logHTTPSStatus();
            middleware(req, res, next);
            
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('HTTP')
            );
            expect(next).toHaveBeenCalled();
        });
        
        it('should include request method and path in log', () => {
            const middleware = logHTTPSStatus();
            middleware(req, res, next);
            
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('GET')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/tenants')
            );
        });
    });
});
