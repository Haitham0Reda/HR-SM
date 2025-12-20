/**
 * Tenant Isolation Enforcement Service Tests
 * 
 * Tests for runtime tenant boundary checks, isolation validation for exports and analysis,
 * and cross-tenant access prevention
 * 
 * Requirements: 3.5 - Tenant isolation enforcement
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import tenantIsolationEnforcement, {
    IsolationCheckResult,
    TenantContextValidator,
    ExportIsolationValidator,
    AnalysisIsolationValidator,
    VIOLATION_TYPES
} from '../../services/tenantIsolationEnforcement.service.js';

describe('Tenant Isolation Enforcement Service', () => {
    let mockReq;
    let mockUserContext;

    beforeEach(() => {
        // Reset service state
        tenantIsolationEnforcement.violationLog = [];
        
        // Create mock request
        mockReq = {
            user: {
                id: 'user123',
                tenantId: 'tenant123',
                role: 'company_admin'
            },
            tenant: {
                tenantId: 'tenant123',
                id: 'tenant123'
            },
            headers: {
                'x-tenant-id': 'tenant123'
            },
            query: {},
            body: {},
            originalUrl: '/api/v1/logs',
            method: 'GET',
            ip: '192.168.1.1'
        };

        mockUserContext = {
            userId: 'user123',
            userRole: 'company_admin',
            permissions: {
                canAccessAllCompanies: false,
                maxTimeRange: 30 * 24 * 60 * 60 * 1000
            }
        };
    });

    afterEach(() => {
        // Clean up
        tenantIsolationEnforcement.violationLog = [];
    });

    describe('IsolationCheckResult', () => {
        test('should create success result', () => {
            const result = IsolationCheckResult.success(['warning1']);
            
            expect(result.valid).toBe(true);
            expect(result.violations).toEqual([]);
            expect(result.warnings).toEqual(['warning1']);
            expect(result.timestamp).toBeDefined();
            expect(result.checkId).toBeDefined();
        });

        test('should create failure result', () => {
            const violations = [{ type: 'test', description: 'test violation' }];
            const result = IsolationCheckResult.failure(violations, ['warning1']);
            
            expect(result.valid).toBe(false);
            expect(result.violations).toEqual(violations);
            expect(result.warnings).toEqual(['warning1']);
        });

        test('should add violations and warnings', () => {
            const result = new IsolationCheckResult(true);
            
            result.addViolation('test_type', 'test description', { key: 'value' });
            result.addWarning('test warning', { key: 'value' });
            
            expect(result.valid).toBe(false);
            expect(result.violations).toHaveLength(1);
            expect(result.warnings).toHaveLength(1);
            expect(result.violations[0].type).toBe('test_type');
            expect(result.warnings[0].description).toBe('test warning');
        });
    });

    describe('TenantContextValidator', () => {
        let validator;

        beforeEach(() => {
            validator = new TenantContextValidator();
        });

        describe('validateTenantContext', () => {
            test('should pass validation for consistent tenant IDs', () => {
                const result = validator.validateTenantContext(mockReq);
                
                expect(result.valid).toBe(true);
                expect(result.violations).toHaveLength(0);
            });

            test('should detect missing tenant ID', () => {
                const reqWithoutTenant = {
                    ...mockReq,
                    user: { id: 'user123' },
                    tenant: null,
                    headers: {}
                };
                
                const result = validator.validateTenantContext(reqWithoutTenant);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.TENANT_SPOOFING);
                expect(result.violations[0].description).toContain('No tenant ID found');
            });

            test('should detect conflicting tenant IDs', () => {
                const reqWithConflict = {
                    ...mockReq,
                    user: { id: 'user123', tenantId: 'tenant123' },
                    headers: { 'x-tenant-id': 'different-tenant' },
                    body: { tenantId: 'another-tenant' }
                };
                
                const result = validator.validateTenantContext(reqWithConflict);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.TENANT_SPOOFING);
                expect(result.violations[0].description).toContain('Conflicting tenant IDs');
            });

            test('should detect missing token tenant ID', () => {
                const reqWithoutTokenTenant = {
                    ...mockReq,
                    user: { id: 'user123' }, // No tenantId in token
                    headers: { 'x-tenant-id': 'tenant123' }
                };
                
                const result = validator.validateTenantContext(reqWithoutTokenTenant);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.TENANT_SPOOFING);
                expect(result.violations[0].description).toContain('No tenant ID in authentication token');
            });
        });

        describe('validateFilePath', () => {
            test('should allow valid tenant-specific path', () => {
                const validPath = 'logs/tenant123/audit.log';
                const result = validator.validateFilePath(validPath, 'tenant123', 'read');
                
                expect(result.valid).toBe(true);
                expect(result.violations).toHaveLength(0);
            });

            test('should detect directory traversal', () => {
                const maliciousPath = '../../../etc/passwd';
                const result = validator.validateFilePath(maliciousPath, 'tenant123', 'read');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.PATH_TRAVERSAL);
                expect(result.violations[0].description).toContain('Directory traversal detected');
            });

            test('should detect path outside logs directory', () => {
                const outsidePath = '/tmp/malicious.log';
                const result = validator.validateFilePath(outsidePath, 'tenant123', 'read');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.ISOLATION_BYPASS);
                expect(result.violations[0].description).toContain('outside logs directory');
            });

            test('should detect cross-tenant access', () => {
                const crossTenantPath = 'logs/other-tenant/audit.log';
                const result = validator.validateFilePath(crossTenantPath, 'tenant123', 'read');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
                expect(result.violations[0].description).toContain('violates tenant isolation');
            });
        });

        describe('validateQueryParameters', () => {
            test('should pass validation for matching tenant ID', () => {
                const queryParams = { tenantId: 'tenant123', search: 'test' };
                const result = validator.validateQueryParameters(queryParams, 'tenant123');
                
                expect(result.valid).toBe(true);
                expect(result.violations).toHaveLength(0);
            });

            test('should detect different tenant ID in query', () => {
                const queryParams = { tenantId: 'other-tenant', search: 'test' };
                const result = validator.validateQueryParameters(queryParams, 'tenant123');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
                expect(result.violations[0].description).toContain('different tenant ID');
            });

            test('should detect different company ID in query', () => {
                const queryParams = { companyId: 'other-company', search: 'test' };
                const result = validator.validateQueryParameters(queryParams, 'tenant123');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
                expect(result.violations[0].description).toContain('different company ID');
            });

            test('should warn about suspicious parameters', () => {
                const queryParams = { 
                    tenant_id: 'other-tenant',
                    org_id: 'some-org-id',
                    search: 'test'
                };
                const result = validator.validateQueryParameters(queryParams, 'tenant123');
                
                expect(result.warnings.length).toBeGreaterThan(0);
                expect(result.warnings[0].description).toContain('Suspicious tenant-related parameter');
            });
        });
    });

    describe('ExportIsolationValidator', () => {
        let validator;

        beforeEach(() => {
            validator = new ExportIsolationValidator();
        });

        describe('validateExportRequest', () => {
            test('should allow valid export request', () => {
                const exportConfig = {
                    filters: { tenantId: 'tenant123' },
                    destination: { type: 'file', path: 'logs/tenant123/export.json' },
                    timeRange: { 
                        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                        end: new Date().toISOString()
                    }
                };
                
                const result = validator.validateExportRequest(exportConfig, 'tenant123', mockUserContext);
                
                expect(result.valid).toBe(true);
                expect(result.violations).toHaveLength(0);
            });

            test('should detect unauthorized all-tenant export', () => {
                const exportConfig = {
                    includeAllTenants: true,
                    filters: {}
                };
                
                const result = validator.validateExportRequest(exportConfig, 'tenant123', mockUserContext);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.UNAUTHORIZED_EXPORT);
                expect(result.violations[0].description).toContain('not authorized to export data from all tenants');
            });
        });

        describe('validateExportFilters', () => {
            test('should detect cross-tenant filter', () => {
                const filters = { tenantId: 'other-tenant', logLevel: 'error' };
                const result = validator.validateExportFilters(filters, 'tenant123');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
                expect(result.violations[0].description).toContain('different tenant ID');
            });

            test('should warn about wildcard patterns', () => {
                const filters = { message: '*password*', tenantId: 'tenant123' };
                const result = validator.validateExportFilters(filters, 'tenant123');
                
                expect(result.warnings.length).toBeGreaterThan(0);
                expect(result.warnings[0].description).toContain('wildcard pattern');
            });
        });

        describe('validateExportDestination', () => {
            test('should validate file destination path', () => {
                const destination = { type: 'file', path: 'logs/other-tenant/export.json' };
                const result = validator.validateExportDestination(destination, 'tenant123');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
            });

            test('should detect private network webhook URLs', () => {
                const destination = { type: 'webhook', url: 'http://192.168.1.100/webhook' };
                const result = validator.validateExportDestination(destination, 'tenant123');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.ISOLATION_BYPASS);
                expect(result.violations[0].description).toContain('private network');
            });

            test('should allow valid external webhook URL', () => {
                const destination = { type: 'webhook', url: 'https://api.external-service.com/webhook' };
                const result = validator.validateExportDestination(destination, 'tenant123');
                
                expect(result.valid).toBe(true);
            });
        });

        describe('validateExportTimeRange', () => {
            test('should detect invalid time range', () => {
                const timeRange = {
                    start: new Date().toISOString(),
                    end: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // End before start
                };
                
                const result = validator.validateExportTimeRange(timeRange, mockUserContext);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.UNAUTHORIZED_EXPORT);
                expect(result.violations[0].description).toContain('start time must be before end time');
            });

            test('should detect future dates', () => {
                const timeRange = {
                    start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Future date
                    end: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
                };
                
                const result = validator.validateExportTimeRange(timeRange, mockUserContext);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.UNAUTHORIZED_EXPORT);
                expect(result.violations[0].description).toContain('cannot export future data');
            });

            test('should enforce role-based time restrictions', () => {
                const timeRange = {
                    start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
                    end: new Date().toISOString()
                };
                
                const result = validator.validateExportTimeRange(timeRange, mockUserContext);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.UNAUTHORIZED_EXPORT);
                expect(result.violations[0].description).toContain('exceeds user permissions');
            });
        });

        describe('isPrivateNetwork', () => {
            test('should detect localhost addresses', () => {
                expect(validator.isPrivateNetwork('localhost')).toBe(true);
                expect(validator.isPrivateNetwork('127.0.0.1')).toBe(true);
                expect(validator.isPrivateNetwork('::1')).toBe(true);
            });

            test('should detect private IP ranges', () => {
                expect(validator.isPrivateNetwork('10.0.0.1')).toBe(true);
                expect(validator.isPrivateNetwork('172.16.0.1')).toBe(true);
                expect(validator.isPrivateNetwork('192.168.1.1')).toBe(true);
            });

            test('should allow public IP addresses', () => {
                expect(validator.isPrivateNetwork('8.8.8.8')).toBe(false);
                expect(validator.isPrivateNetwork('1.1.1.1')).toBe(false);
                expect(validator.isPrivateNetwork('api.example.com')).toBe(false);
            });
        });
    });

    describe('AnalysisIsolationValidator', () => {
        let validator;

        beforeEach(() => {
            validator = new AnalysisIsolationValidator();
        });

        describe('validateAnalysisQuery', () => {
            test('should allow valid analysis query', () => {
                const query = {
                    filters: { tenantId: 'tenant123', logLevel: 'error' },
                    aggregation: { groupBy: ['logLevel', 'timestamp'] }
                };
                
                const result = validator.validateAnalysisQuery(query, 'tenant123', mockUserContext);
                
                expect(result.valid).toBe(true);
                expect(result.violations).toHaveLength(0);
            });

            test('should detect unauthorized cross-tenant analysis', () => {
                const query = {
                    includeCrossTenantAnalysis: true,
                    filters: {}
                };
                
                const result = validator.validateAnalysisQuery(query, 'tenant123', mockUserContext);
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
                expect(result.violations[0].description).toContain('not authorized for cross-tenant analysis');
            });
        });

        describe('validateAnalysisFilters', () => {
            test('should detect cross-tenant filter array', () => {
                const filters = { tenantId: ['tenant123', 'other-tenant'] };
                const result = validator.validateAnalysisFilters(filters, 'tenant123');
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
                expect(result.violations[0].description).toContain('unauthorized tenant IDs');
            });

            test('should allow valid tenant filter array', () => {
                const filters = { tenantId: ['tenant123'], logLevel: 'error' };
                const result = validator.validateAnalysisFilters(filters, 'tenant123');
                
                expect(result.valid).toBe(true);
            });
        });

        describe('validateGroupByFields', () => {
            test('should warn about sensitive group-by fields', () => {
                const groupByFields = ['tenantId', 'userId', 'logLevel'];
                const result = validator.validateGroupByFields(groupByFields, 'tenant123');
                
                expect(result.warnings.length).toBeGreaterThan(0);
                expect(result.warnings[0].description).toContain('may expose cross-tenant information');
            });

            test('should allow safe group-by fields', () => {
                const groupByFields = ['logLevel', 'timestamp', 'source'];
                const result = validator.validateGroupByFields(groupByFields, 'tenant123');
                
                expect(result.warnings).toHaveLength(0);
            });
        });
    });

    describe('TenantIsolationEnforcementEngine', () => {
        describe('enforceRequestIsolation', () => {
            test('should pass validation for valid request', () => {
                const result = tenantIsolationEnforcement.enforceRequestIsolation(mockReq);
                
                expect(result.valid).toBe(true);
                expect(result.violations).toHaveLength(0);
            });

            test('should detect tenant context violations', () => {
                const invalidReq = {
                    user: { id: 'user123' }, // No tenantId
                    tenant: null,
                    headers: {},
                    query: {},
                    body: {},
                    originalUrl: '/api/v1/logs',
                    method: 'GET'
                };
                
                const result = tenantIsolationEnforcement.enforceRequestIsolation(invalidReq);
                
                expect(result.valid).toBe(false);
                expect(result.violations.length).toBeGreaterThan(0);
            });

            test('should detect query parameter violations', () => {
                const reqWithBadQuery = {
                    ...mockReq,
                    query: { tenantId: 'other-tenant' }
                };
                
                const result = tenantIsolationEnforcement.enforceRequestIsolation(reqWithBadQuery);
                
                expect(result.valid).toBe(false);
                // The actual violation type depends on the validation logic
                expect(result.violations.length).toBeGreaterThan(0);
            });
        });

        describe('enforceFileIsolation', () => {
            test('should allow valid file access', () => {
                const result = tenantIsolationEnforcement.enforceFileIsolation(
                    'logs/tenant123/audit.log',
                    'tenant123',
                    'read'
                );
                
                expect(result.valid).toBe(true);
            });

            test('should deny cross-tenant file access', () => {
                const result = tenantIsolationEnforcement.enforceFileIsolation(
                    'logs/other-tenant/audit.log',
                    'tenant123',
                    'read'
                );
                
                expect(result.valid).toBe(false);
                expect(result.violations[0].type).toBe(VIOLATION_TYPES.CROSS_TENANT_DATA_ACCESS);
            });
        });

        describe('enforceExportIsolation', () => {
            test('should allow valid export', () => {
                const exportConfig = {
                    filters: { tenantId: 'tenant123' },
                    destination: { type: 'file', path: '../logs/tenant123/export.json' }
                };
                
                const result = tenantIsolationEnforcement.enforceExportIsolation(
                    exportConfig,
                    'tenant123',
                    mockUserContext
                );
                
                expect(result.valid).toBe(true);
            });

            test('should deny invalid export', () => {
                const exportConfig = {
                    includeAllTenants: true
                };
                
                const result = tenantIsolationEnforcement.enforceExportIsolation(
                    exportConfig,
                    'tenant123',
                    mockUserContext
                );
                
                expect(result.valid).toBe(false);
            });
        });

        describe('enforceAnalysisIsolation', () => {
            test('should allow valid analysis', () => {
                const query = {
                    filters: { tenantId: 'tenant123' }
                };
                
                const result = tenantIsolationEnforcement.enforceAnalysisIsolation(
                    query,
                    'tenant123',
                    mockUserContext
                );
                
                expect(result.valid).toBe(true);
            });

            test('should deny cross-tenant analysis', () => {
                const query = {
                    includeCrossTenantAnalysis: true
                };
                
                const result = tenantIsolationEnforcement.enforceAnalysisIsolation(
                    query,
                    'tenant123',
                    mockUserContext
                );
                
                expect(result.valid).toBe(false);
            });
        });

        describe('violation logging', () => {
            test('should log violations', () => {
                const invalidReq = {
                    ...mockReq,
                    user: { id: 'user123' },
                    tenant: null,
                    headers: {}
                };
                
                tenantIsolationEnforcement.enforceRequestIsolation(invalidReq);
                
                expect(tenantIsolationEnforcement.violationLog).toHaveLength(1);
                expect(tenantIsolationEnforcement.violationLog[0].violations.length).toBeGreaterThan(0);
            });

            test('should trim violation log when it exceeds max size', () => {
                tenantIsolationEnforcement.maxViolationEntries = 2;
                
                // Generate multiple violations
                for (let i = 0; i < 4; i++) {
                    const invalidReq = {
                        ...mockReq,
                        user: { id: `user${i}` },
                        tenant: null,
                        headers: {}
                    };
                    tenantIsolationEnforcement.enforceRequestIsolation(invalidReq);
                }
                
                expect(tenantIsolationEnforcement.violationLog).toHaveLength(2);
            });
        });

        describe('getViolationLog', () => {
            beforeEach(() => {
                // Add test violations
                const invalidReq = {
                    ...mockReq,
                    user: { id: 'user123' },
                    tenant: null,
                    headers: {}
                };
                tenantIsolationEnforcement.enforceRequestIsolation(invalidReq);
            });

            test('should return violation log', () => {
                const log = tenantIsolationEnforcement.getViolationLog();
                
                expect(log).toHaveLength(1);
                expect(log[0].violations.length).toBeGreaterThan(0);
            });

            test('should filter violation log by time', () => {
                const futureTime = new Date(Date.now() + 60000).toISOString();
                const log = tenantIsolationEnforcement.getViolationLog({ startTime: futureTime });
                
                expect(log).toHaveLength(0);
            });

            test('should filter violation log by type', () => {
                const log = tenantIsolationEnforcement.getViolationLog({ 
                    violationType: VIOLATION_TYPES.TENANT_SPOOFING 
                });
                
                expect(log).toHaveLength(1);
            });
        });

        describe('clearViolationLog', () => {
            test('should clear violation log', () => {
                // Add a violation first
                const invalidReq = {
                    ...mockReq,
                    user: { id: 'user123' },
                    tenant: null,
                    headers: {}
                };
                tenantIsolationEnforcement.enforceRequestIsolation(invalidReq);
                
                const clearedCount = tenantIsolationEnforcement.clearViolationLog();
                
                expect(clearedCount).toBe(1);
                expect(tenantIsolationEnforcement.violationLog).toHaveLength(0);
            });
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete isolation enforcement flow', () => {
            // Test request isolation
            const requestResult = tenantIsolationEnforcement.enforceRequestIsolation(mockReq);
            expect(requestResult.valid).toBe(true);
            
            // Test file isolation
            const fileResult = tenantIsolationEnforcement.enforceFileIsolation(
                'logs/tenant123/audit.log',
                'tenant123',
                'read'
            );
            expect(fileResult.valid).toBe(true);
            
            // Test export isolation
            const exportConfig = {
                filters: { tenantId: 'tenant123' },
                destination: { type: 'file', path: 'logs/tenant123/export.json' }
            };
            const exportResult = tenantIsolationEnforcement.enforceExportIsolation(
                exportConfig,
                'tenant123',
                mockUserContext
            );
            expect(exportResult.valid).toBe(true);
            
            // Test analysis isolation
            const query = { filters: { tenantId: 'tenant123' } };
            const analysisResult = tenantIsolationEnforcement.enforceAnalysisIsolation(
                query,
                'tenant123',
                mockUserContext
            );
            expect(analysisResult.valid).toBe(true);
        });

        test('should handle error conditions gracefully', () => {
            // Test with null inputs - should return violations, not throw
            const nullResult = tenantIsolationEnforcement.enforceRequestIsolation(null);
            expect(nullResult.valid).toBe(false);
            expect(nullResult.violations.length).toBeGreaterThan(0);
            
            const fileResult = tenantIsolationEnforcement.enforceFileIsolation(null, 'tenant123');
            expect(fileResult.valid).toBe(false);
            expect(fileResult.violations.length).toBeGreaterThan(0);
        });
    });
});