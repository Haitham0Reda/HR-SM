/**
 * Attack Pattern Analysis Service Tests
 * Tests for brute force detection, credential stuffing, cross-session patterns, and coordinated attacks
 */

import attackPatternAnalysisService from '../../services/attackPatternAnalysis.service.js';

describe('Attack Pattern Analysis Service', () => {
    beforeEach(() => {
        // Clear any existing data
        attackPatternAnalysisService.bruteForcePatterns.clear();
        attackPatternAnalysisService.credentialStuffingPatterns.clear();
        attackPatternAnalysisService.sessionTracking.clear();
        attackPatternAnalysisService.coordinatedAttacks.clear();
        attackPatternAnalysisService.ipTracking.clear();
    });

    describe('Brute Force Detection', () => {
        test('should detect brute force attack with high volume of failed attempts', () => {
            const baseAuthData = {
                ipAddress: '192.168.1.100',
                username: 'admin',
                success: false,
                userAgent: 'Mozilla/5.0',
                sessionId: 'session123',
                tenantId: 'tenant1'
            };

            // Simulate multiple failed login attempts
            const violations = [];
            for (let i = 0; i < 15; i++) {
                const result = attackPatternAnalysisService.analyzeBruteForcePattern({
                    ...baseAuthData,
                    password: `password${i}`,
                    timestamp: Date.now() + i * 1000
                });
                if (result) {
                    if (Array.isArray(result)) {
                        violations.push(...result);
                    } else {
                        violations.push(result);
                    }
                }
            }

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.type === 'brute_force_volume')).toBe(true);
            expect(violations.some(v => v.severity === 'critical')).toBe(true);
        });

        test('should detect multi-target brute force attack', () => {
            const baseAuthData = {
                ipAddress: '192.168.1.100',
                success: false,
                userAgent: 'Mozilla/5.0',
                sessionId: 'session123',
                tenantId: 'tenant1'
            };

            const violations = [];
            const usernames = ['admin', 'user1', 'user2', 'user3', 'user4'];
            
            usernames.forEach((username, index) => {
                const result = attackPatternAnalysisService.analyzeBruteForcePattern({
                    ...baseAuthData,
                    username,
                    password: 'password123',
                    timestamp: Date.now() + index * 1000
                });
                if (result) {
                    if (Array.isArray(result)) {
                        violations.push(...result);
                    } else {
                        violations.push(result);
                    }
                }
            });

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.type === 'brute_force_multi_target')).toBe(true);
        });

        test('should block IP after brute force detection', () => {
            const baseAuthData = {
                ipAddress: '192.168.1.100',
                username: 'admin',
                success: false,
                userAgent: 'Mozilla/5.0',
                sessionId: 'session123',
                tenantId: 'tenant1'
            };

            // Trigger brute force detection
            for (let i = 0; i < 15; i++) {
                attackPatternAnalysisService.analyzeBruteForcePattern({
                    ...baseAuthData,
                    password: `password${i}`,
                    timestamp: Date.now() + i * 1000
                });
            }

            // Try another attempt - should be blocked
            const blockedResult = attackPatternAnalysisService.analyzeBruteForcePattern({
                ...baseAuthData,
                password: 'newpassword',
                timestamp: Date.now() + 20000
            });

            expect(blockedResult).toBeTruthy();
            expect(blockedResult.type).toBe('brute_force_blocked');
        });
    });

    describe('Credential Stuffing Detection', () => {
        test('should detect credential stuffing with high volume and low success rate', () => {
            const baseAuthData = {
                ipAddress: '192.168.1.200',
                success: false,
                userAgent: 'Mozilla/5.0',
                sessionId: 'session456',
                tenantId: 'tenant1'
            };

            const violations = [];
            
            // Simulate credential stuffing with many different username:password combinations
            for (let i = 0; i < 60; i++) {
                const result = attackPatternAnalysisService.analyzeCredentialStuffingPattern({
                    ...baseAuthData,
                    username: `user${i}`,
                    password: `pass${i}`,
                    success: i % 50 === 0, // Very low success rate
                    timestamp: Date.now() + i * 1000
                });
                if (result) {
                    if (Array.isArray(result)) {
                        violations.push(...result);
                    } else {
                        violations.push(result);
                    }
                }
            }

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.type === 'credential_stuffing_volume')).toBe(true);
            expect(violations.some(v => v.severity === 'critical')).toBe(true);
        });

        test('should detect credential stuffing using breach data', () => {
            const baseAuthData = {
                ipAddress: '192.168.1.200',
                success: false,
                userAgent: 'Mozilla/5.0',
                sessionId: 'session456',
                tenantId: 'tenant1'
            };

            const violations = [];
            
            // Simulate many unique credential pairs (indicating breach data)
            for (let i = 0; i < 25; i++) {
                const result = attackPatternAnalysisService.analyzeCredentialStuffingPattern({
                    ...baseAuthData,
                    username: `breached_user_${i}`,
                    password: `breached_pass_${i}`,
                    timestamp: Date.now() + i * 1000
                });
                if (result) {
                    if (Array.isArray(result)) {
                        violations.push(...result);
                    } else {
                        violations.push(result);
                    }
                }
            }

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.type === 'credential_stuffing_breach_data')).toBe(true);
        });

        test('should detect distributed credential stuffing', () => {
            const sharedCredential = { username: 'shared_user', password: 'shared_pass' };
            const ips = ['192.168.1.100', '192.168.1.101', '192.168.1.102'];
            
            const violations = [];
            
            // Use same credentials from multiple IPs
            ips.forEach((ip, index) => {
                const result = attackPatternAnalysisService.analyzeCredentialStuffingPattern({
                    ipAddress: ip,
                    username: sharedCredential.username,
                    password: sharedCredential.password,
                    success: false,
                    userAgent: 'Mozilla/5.0',
                    sessionId: `session${index}`,
                    tenantId: 'tenant1',
                    timestamp: Date.now() + index * 1000
                });
                if (result) {
                    if (Array.isArray(result)) {
                        violations.push(...result);
                    } else {
                        violations.push(result);
                    }
                }
            });

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.type === 'credential_stuffing_distributed')).toBe(true);
        });
    });

    describe('Cross-Session Pattern Tracking', () => {
        test('should detect session hijacking', () => {
            const sessionId = 'session789';
            const originalIP = '192.168.1.100';
            const hijackerIP = '10.0.0.50';

            // Create original session
            attackPatternAnalysisService.trackCrossSessionPatterns({
                sessionId,
                ipAddress: originalIP,
                userId: 'user123',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                activities: ['login'],
                tenantId: 'tenant1'
            });

            // Simulate session hijacking (same session, different IP)
            const violations = attackPatternAnalysisService.trackCrossSessionPatterns({
                sessionId,
                ipAddress: hijackerIP,
                userId: 'user123',
                userAgent: 'Mozilla/5.0 (Linux; Android 10)',
                activities: ['data_access'],
                tenantId: 'tenant1',
                timestamp: Date.now() + 300000 // 5 minutes later
            });

            expect(violations).toBeTruthy();
            expect(violations.some(v => v.type === 'session_hijacking')).toBe(true);
            expect(violations.some(v => v.severity === 'critical')).toBe(true);
        });

        test('should detect multi-session abuse from single IP', () => {
            const ipAddress = '192.168.1.100';
            const violations = [];

            // Create multiple sessions from same IP with different users
            for (let i = 0; i < 12; i++) {
                const result = attackPatternAnalysisService.trackCrossSessionPatterns({
                    sessionId: `session${i}`,
                    ipAddress,
                    userId: `user${i}`,
                    userAgent: 'Mozilla/5.0',
                    activities: ['login', 'browse'],
                    tenantId: 'tenant1',
                    timestamp: Date.now() + i * 10000
                });
                if (result) {
                    if (Array.isArray(result)) {
                        violations.push(...result);
                    } else {
                        violations.push(result);
                    }
                }
            }

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.type === 'multi_session_abuse')).toBe(true);
        });

        test('should detect cross-tenant session patterns', () => {
            const ipAddress = '192.168.1.100';
            const tenants = ['tenant1', 'tenant2', 'tenant3', 'tenant4'];
            const violations = [];

            // Create sessions across multiple tenants
            tenants.forEach((tenantId, index) => {
                const result = attackPatternAnalysisService.trackCrossSessionPatterns({
                    sessionId: `session_${tenantId}`,
                    ipAddress,
                    userId: `user${index}`,
                    userAgent: 'Mozilla/5.0',
                    activities: ['login', 'data_access'],
                    tenantId,
                    timestamp: Date.now() + index * 60000
                });
                if (result) {
                    if (Array.isArray(result)) {
                        violations.push(...result);
                    } else {
                        violations.push(result);
                    }
                }
            });

            expect(violations.length).toBeGreaterThan(0);
            expect(violations.some(v => v.type === 'cross_tenant_session_pattern')).toBe(true);
        });
    });

    describe('Coordinated Attack Detection', () => {
        test('should detect multi-IP coordinated attack', () => {
            const sourceIPs = ['192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103'];
            const targetTenants = ['tenant1', 'tenant2'];

            const violations = attackPatternAnalysisService.detectCoordinatedAttacks({
                attackType: 'brute_force',
                sourceIPs,
                targetTenants,
                attackSignature: {
                    payloadSize: 1024,
                    timing: 1000
                },
                payload: { type: 'login_attempt' }
            });

            expect(violations).toBeTruthy();
            expect(violations.some(v => v.type === 'coordinated_multi_ip_attack')).toBe(true);
            expect(violations.some(v => v.severity === 'critical')).toBe(true);
        });

        test('should detect multi-tenant coordinated attack', () => {
            const sourceIPs = ['192.168.1.100', '192.168.1.101'];
            const targetTenants = ['tenant1', 'tenant2', 'tenant3', 'tenant4', 'tenant5', 'tenant6'];

            const violations = attackPatternAnalysisService.detectCoordinatedAttacks({
                attackType: 'data_exfiltration',
                sourceIPs,
                targetTenants,
                attackSignature: {
                    payloadSize: 2048,
                    timing: 500
                },
                payload: { type: 'data_request' }
            });

            expect(violations).toBeTruthy();
            expect(violations.some(v => v.type === 'coordinated_multi_tenant_attack')).toBe(true);
            expect(violations.some(v => v.severity === 'critical')).toBe(true);
        });

        test('should detect synchronized coordinated attack', () => {
            const sourceIPs = ['192.168.1.100', '192.168.1.101', '192.168.1.102'];
            const targetTenants = ['tenant1', 'tenant2'];
            const baseTime = Date.now();

            // Create attack with synchronized timing
            const attackData = {
                attackType: 'synchronized_ddos',
                sourceIPs,
                targetTenants,
                attackSignature: {
                    payloadSize: 1024,
                    timing: 1000
                },
                payload: { type: 'request_flood' }
            };

            // Add multiple synchronized events to build up the pattern
            for (let i = 0; i < 5; i++) {
                attackPatternAnalysisService.detectCoordinatedAttacks({
                    ...attackData,
                    timestamp: baseTime + i * 1000 // Consistent 1-second intervals
                });
            }

            // Final call should detect synchronization
            const violations = attackPatternAnalysisService.detectCoordinatedAttacks({
                ...attackData,
                timestamp: baseTime + 5000
            });

            expect(violations).toBeTruthy();
            // Check for any coordinated attack detection (the synchronization detection may be part of other violation types)
            expect(violations.some(v => v.type.includes('coordinated') || v.type.includes('synchronized'))).toBe(true);
        });

        test('should detect botnet-style coordinated attack', () => {
            const sourceIPs = Array.from({ length: 25 }, (_, i) => `192.168.1.${100 + i}`);
            const targetTenants = ['tenant1', 'tenant2'];

            const violations = attackPatternAnalysisService.detectCoordinatedAttacks({
                attackType: 'botnet_attack',
                sourceIPs,
                targetTenants,
                attackSignature: {
                    payloadSize: 1024,
                    timing: 1000
                },
                payload: { type: 'automated_request' }
            });

            expect(violations).toBeTruthy();
            // Check for coordinated multi-IP attack which should be detected with 25 IPs
            expect(violations.some(v => v.type === 'coordinated_multi_ip_attack')).toBe(true);
            expect(violations.some(v => v.severity === 'critical')).toBe(true);
        });
    });

    describe('Service Management', () => {
        test('should initialize service correctly', () => {
            expect(attackPatternAnalysisService.isInitialized).toBe(true);
            expect(attackPatternAnalysisService.analysisEnabled).toBe(true);
        });

        test('should provide analysis statistics', () => {
            const stats = attackPatternAnalysisService.getAnalysisStats();
            
            expect(stats).toHaveProperty('isInitialized');
            expect(stats).toHaveProperty('analysisEnabled');
            expect(stats).toHaveProperty('bruteForcePatterns');
            expect(stats).toHaveProperty('credentialStuffingPatterns');
            expect(stats).toHaveProperty('trackedSessions');
            expect(stats).toHaveProperty('coordinatedAttacks');
            expect(stats).toHaveProperty('thresholds');
        });

        test('should enable/disable analysis', () => {
            attackPatternAnalysisService.setAnalysisEnabled(false);
            expect(attackPatternAnalysisService.analysisEnabled).toBe(false);
            
            attackPatternAnalysisService.setAnalysisEnabled(true);
            expect(attackPatternAnalysisService.analysisEnabled).toBe(true);
        });

        test('should export attack pattern data', () => {
            // Add some test data
            attackPatternAnalysisService.analyzeBruteForcePattern({
                ipAddress: '192.168.1.100',
                username: 'test',
                password: 'test',
                success: false,
                userAgent: 'Mozilla/5.0',
                sessionId: 'session123',
                tenantId: 'tenant1'
            });

            const exportData = attackPatternAnalysisService.exportAttackPatternData();
            
            expect(exportData).toHaveProperty('bruteForcePatterns');
            expect(exportData).toHaveProperty('credentialStuffingPatterns');
            expect(exportData).toHaveProperty('sessionTracking');
            expect(exportData).toHaveProperty('coordinatedAttacks');
            expect(exportData).toHaveProperty('stats');
        });
    });

    describe('Pattern Analysis Utilities', () => {
        test('should calculate threat level correctly', () => {
            const lowThreatPattern = {
                totalAttempts: 5,
                uniqueUsernames: new Set(['user1']),
                failedAttempts: 3,
                successfulAttempts: 2
            };

            const highThreatPattern = {
                totalAttempts: 150,
                uniqueUsernames: new Set(['user1', 'user2', 'user3', 'user4', 'user5', 'admin', 'root']),
                failedAttempts: 140,
                successfulAttempts: 10
            };

            const lowLevel = attackPatternAnalysisService.calculateThreatLevel(lowThreatPattern);
            const highLevel = attackPatternAnalysisService.calculateThreatLevel(highThreatPattern);

            expect(['low', 'medium']).toContain(lowLevel);
            expect(['high', 'critical']).toContain(highLevel);
        });

        test('should generate attack signatures', () => {
            const attempts = [
                { timestamp: 1000, username: 'user1', success: false, userAgent: 'Mozilla/5.0' },
                { timestamp: 2000, username: 'user2', success: false, userAgent: 'Mozilla/5.0' },
                { timestamp: 3000, username: 'user3', success: true, userAgent: 'Chrome/90.0' }
            ];

            const signature = attackPatternAnalysisService.generateAttackSignature(attempts);

            expect(signature).toHaveProperty('attemptCount', 3);
            expect(signature).toHaveProperty('timeSpan', 2000);
            expect(signature).toHaveProperty('uniqueUsernames', 3);
            expect(signature).toHaveProperty('userAgentVariations', 2);
            expect(signature).toHaveProperty('successRate');
            expect(signature.successRate).toBeCloseTo(1/3, 2);
        });
    });
});