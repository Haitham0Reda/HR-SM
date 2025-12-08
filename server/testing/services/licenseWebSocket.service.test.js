// testing/services/licenseWebSocket.service.test.js
import { describe, test, expect, beforeEach, afterEach, jest, beforeAll } from '@jest/globals';
import http from 'http';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import licenseWebSocketService from '../../services/licenseWebSocket.service.js';

describe('LicenseWebSocket Service', () => {
    let server;
    let httpServer;
    const PORT = 5555; // Use different port for testing
    const JWT_SECRET = 'test-secret-key-for-websocket-testing';

    beforeAll(() => {
        // Set JWT_SECRET for testing
        process.env.JWT_SECRET = JWT_SECRET;
    });

    beforeEach((done) => {
        // Create a simple HTTP server for testing
        httpServer = http.createServer();
        licenseWebSocketService.initialize(httpServer);
        
        httpServer.listen(PORT, () => {
            done();
        });
    });

    afterEach((done) => {
        licenseWebSocketService.shutdown();
        httpServer.close(() => {
            done();
        });
    });

    test('should initialize WebSocket server', () => {
        expect(licenseWebSocketService.wss).toBeDefined();
        expect(licenseWebSocketService.wss).not.toBeNull();
    });

    test('should reject connection without token', (done) => {
        const ws = new WebSocket(`ws://localhost:${PORT}/ws/license`);

        ws.on('close', (code, reason) => {
            expect(code).toBe(1008);
            expect(reason.toString()).toContain('Authentication required');
            done();
        });

        ws.on('error', () => {
            // Connection will be closed, error is expected
        });
    });

    test('should accept connection with valid token', (done) => {
        const token = jwt.sign(
            { tenantId: 'test-tenant-123', userId: 'user-123' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const ws = new WebSocket(`ws://localhost:${PORT}/ws/license?token=${token}`);

        ws.on('open', () => {
            expect(ws.readyState).toBe(WebSocket.OPEN);
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'connected') {
                expect(message.type).toBe('connected');
                expect(message.message).toBe('License updates subscription active');
                ws.close();
                done();
            }
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should handle ping-pong messages', (done) => {
        const token = jwt.sign(
            { tenantId: 'test-tenant-123', userId: 'user-123' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const ws = new WebSocket(`ws://localhost:${PORT}/ws/license?token=${token}`);

        ws.on('open', () => {
            ws.send(JSON.stringify({ type: 'ping' }));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'pong') {
                expect(message.type).toBe('pong');
                expect(message.timestamp).toBeDefined();
                ws.close();
                done();
            }
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should broadcast license expiration notification', (done) => {
        const tenantId = 'test-tenant-456';
        const token = jwt.sign(
            { tenantId, userId: 'user-456' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const ws = new WebSocket(`ws://localhost:${PORT}/ws/license?token=${token}`);

        ws.on('open', () => {
            // Wait a bit for connection to be registered
            setTimeout(() => {
                licenseWebSocketService.notifyLicenseExpiring(
                    tenantId,
                    'attendance',
                    new Date('2025-02-01'),
                    15
                );
            }, 100);
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'license_expiring') {
                expect(message.type).toBe('license_expiring');
                expect(message.moduleKey).toBe('attendance');
                expect(message.daysUntilExpiration).toBe(15);
                expect(message.severity).toBe('warning');
                ws.close();
                done();
            }
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should broadcast usage limit warning', (done) => {
        const tenantId = 'test-tenant-789';
        const token = jwt.sign(
            { tenantId, userId: 'user-789' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const ws = new WebSocket(`ws://localhost:${PORT}/ws/license?token=${token}`);

        ws.on('open', () => {
            setTimeout(() => {
                licenseWebSocketService.notifyUsageLimitWarning(
                    tenantId,
                    'attendance',
                    'employees',
                    45,
                    50,
                    90
                );
            }, 100);
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'usage_limit_warning') {
                expect(message.type).toBe('usage_limit_warning');
                expect(message.moduleKey).toBe('attendance');
                expect(message.limitType).toBe('employees');
                expect(message.currentUsage).toBe(45);
                expect(message.limit).toBe(50);
                expect(message.percentage).toBe(90);
                expect(message.severity).toBe('warning');
                ws.close();
                done();
            }
        });

        ws.on('error', (error) => {
            done(error);
        });
    });

    test('should get connection statistics', () => {
        const stats = licenseWebSocketService.getStats();
        expect(stats).toBeDefined();
        expect(stats.totalTenants).toBeDefined();
        expect(stats.totalConnections).toBeDefined();
        expect(stats.tenantConnections).toBeDefined();
    });

    test('should handle multiple clients for same tenant', (done) => {
        const tenantId = 'test-tenant-multi';
        const token = jwt.sign(
            { tenantId, userId: 'user-multi' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        const ws1 = new WebSocket(`ws://localhost:${PORT}/ws/license?token=${token}`);
        const ws2 = new WebSocket(`ws://localhost:${PORT}/ws/license?token=${token}`);

        let connectedCount = 0;
        let messageCount = 0;

        const checkDone = () => {
            if (messageCount === 2) {
                ws1.close();
                ws2.close();
                done();
            }
        };

        ws1.on('open', () => {
            connectedCount++;
            if (connectedCount === 2) {
                setTimeout(() => {
                    licenseWebSocketService.notifyModuleActivated(tenantId, 'payroll');
                }, 100);
            }
        });

        ws2.on('open', () => {
            connectedCount++;
            if (connectedCount === 2) {
                setTimeout(() => {
                    licenseWebSocketService.notifyModuleActivated(tenantId, 'payroll');
                }, 100);
            }
        });

        ws1.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'module_activated') {
                messageCount++;
                checkDone();
            }
        });

        ws2.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'module_activated') {
                messageCount++;
                checkDone();
            }
        });

        ws1.on('error', (error) => done(error));
        ws2.on('error', (error) => done(error));
    });
});
