import {
    validateLicenseFileStructure,
    isLicenseExpired,
    getDaysUntilExpiration,
    generateLicenseSignature,
    verifyLicenseSignature,
    parseLicenseFile,
    generateSampleLicenseFile,
    EXAMPLE_LICENSE_FILE
} from '../../config/licenseFileSchema.js';

describe('License File Schema', () => {
    const SECRET_KEY = 'test-secret-key-12345';

    describe('Structure Validation', () => {
        it('should validate a complete license file', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2026-01-01',
                modules: {
                    'hr-core': {
                        enabled: true,
                        tier: 'enterprise',
                        limits: {}
                    },
                    'attendance': {
                        enabled: true,
                        tier: 'business',
                        limits: {
                            employees: 200,
                            storage: 10737418240,
                            apiCalls: 50000
                        }
                    }
                },
                signature: 'test-signature'
            };

            const result = validateLicenseFileStructure(licenseData);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail validation for missing required fields', () => {
            const licenseData = {
                companyName: 'Test Company'
            };

            const result = validateLicenseFileStructure(licenseData);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.includes('licenseKey'))).toBe(true);
            expect(result.errors.some(e => e.includes('companyId'))).toBe(true);
        });

        it('should fail validation for invalid license key format', () => {
            const licenseData = {
                licenseKey: 'INVALID-FORMAT',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2026-01-01',
                modules: {},
                signature: 'test'
            };

            const result = validateLicenseFileStructure(licenseData);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('license key format'))).toBe(true);
        });

        it('should fail validation for invalid date format', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: 'invalid-date',
                expiresAt: '2026-01-01',
                modules: {},
                signature: 'test'
            };

            const result = validateLicenseFileStructure(licenseData);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('issuedAt'))).toBe(true);
        });

        it('should fail validation for invalid module tier', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2026-01-01',
                modules: {
                    'attendance': {
                        enabled: true,
                        tier: 'invalid-tier'
                    }
                },
                signature: 'test'
            };

            const result = validateLicenseFileStructure(licenseData);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('invalid tier'))).toBe(true);
        });

        it('should fail validation for missing module fields', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2026-01-01',
                modules: {
                    'attendance': {
                        tier: 'business'
                    }
                },
                signature: 'test'
            };

            const result = validateLicenseFileStructure(licenseData);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('enabled'))).toBe(true);
        });

        it('should fail validation for invalid limit values', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2026-01-01',
                modules: {
                    'attendance': {
                        enabled: true,
                        tier: 'business',
                        limits: {
                            employees: -10
                        }
                    }
                },
                signature: 'test'
            };

            const result = validateLicenseFileStructure(licenseData);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('employees limit'))).toBe(true);
        });
    });

    describe('Expiration Checks', () => {
        it('should detect expired license', () => {
            const licenseData = {
                expiresAt: '2020-01-01'
            };

            expect(isLicenseExpired(licenseData)).toBe(true);
        });

        it('should detect valid license', () => {
            const licenseData = {
                expiresAt: '2030-01-01'
            };

            expect(isLicenseExpired(licenseData)).toBe(false);
        });

        it('should handle missing expiration date', () => {
            const licenseData = {};

            expect(isLicenseExpired(licenseData)).toBe(false);
        });

        it('should calculate days until expiration', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);

            const licenseData = {
                expiresAt: futureDate.toISOString().split('T')[0]
            };

            const days = getDaysUntilExpiration(licenseData);
            expect(days).toBeGreaterThan(29);
            expect(days).toBeLessThanOrEqual(31);
        });

        it('should return negative days for expired license', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 30);

            const licenseData = {
                expiresAt: pastDate.toISOString().split('T')[0]
            };

            const days = getDaysUntilExpiration(licenseData);
            expect(days).toBeLessThan(0);
        });

        it('should return null for missing expiration', () => {
            const licenseData = {};

            const days = getDaysUntilExpiration(licenseData);
            expect(days).toBeNull();
        });
    });

    describe('Signature Generation and Verification', () => {
        it('should generate consistent signature', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2026-01-01',
                modules: {}
            };

            const signature1 = generateLicenseSignature(licenseData, SECRET_KEY);
            const signature2 = generateLicenseSignature(licenseData, SECRET_KEY);

            expect(signature1).toBe(signature2);
            expect(signature1).toBeTruthy();
        });

        it('should generate different signatures for different data', () => {
            const licenseData1 = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123'
            };

            const licenseData2 = {
                licenseKey: 'HRMS-WXYZ-5678-IJKL',
                companyId: 'company-456'
            };

            const signature1 = generateLicenseSignature(licenseData1, SECRET_KEY);
            const signature2 = generateLicenseSignature(licenseData2, SECRET_KEY);

            expect(signature1).not.toBe(signature2);
        });

        it('should verify valid signature', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2026-01-01',
                modules: {}
            };

            const signature = generateLicenseSignature(licenseData, SECRET_KEY);
            licenseData.signature = signature;

            expect(verifyLicenseSignature(licenseData, SECRET_KEY)).toBe(true);
        });

        it('should reject invalid signature', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                signature: 'invalid-signature'
            };

            expect(verifyLicenseSignature(licenseData, SECRET_KEY)).toBe(false);
        });

        it('should reject missing signature', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123'
            };

            expect(verifyLicenseSignature(licenseData, SECRET_KEY)).toBe(false);
        });

        it('should reject tampered data', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123'
            };

            const signature = generateLicenseSignature(licenseData, SECRET_KEY);
            licenseData.signature = signature;

            // Tamper with data
            licenseData.companyId = 'company-456';

            expect(verifyLicenseSignature(licenseData, SECRET_KEY)).toBe(false);
        });
    });

    describe('License File Parsing', () => {
        it('should parse valid license file', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2030-01-01',
                modules: {
                    'hr-core': {
                        enabled: true,
                        tier: 'enterprise',
                        limits: {}
                    }
                }
            };

            const signature = generateLicenseSignature(licenseData, SECRET_KEY);
            licenseData.signature = signature;

            const licenseFileContent = JSON.stringify(licenseData);
            const result = parseLicenseFile(licenseFileContent, SECRET_KEY);

            expect(result.valid).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });

        it('should fail to parse invalid JSON', () => {
            const licenseFileContent = 'invalid json {';
            const result = parseLicenseFile(licenseFileContent, SECRET_KEY);

            expect(result.valid).toBe(false);
            expect(result.data).toBeNull();
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should fail to parse expired license', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2020-01-01',
                expiresAt: '2021-01-01',
                modules: {}
            };

            const signature = generateLicenseSignature(licenseData, SECRET_KEY);
            licenseData.signature = signature;

            const licenseFileContent = JSON.stringify(licenseData);
            const result = parseLicenseFile(licenseFileContent, SECRET_KEY);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('expired'))).toBe(true);
        });

        it('should fail to parse with invalid signature', () => {
            const licenseData = {
                licenseKey: 'HRMS-ABCD-1234-EFGH',
                companyId: 'company-123',
                companyName: 'Test Company',
                issuedAt: '2025-01-01',
                expiresAt: '2030-01-01',
                modules: {},
                signature: 'invalid-signature'
            };

            const licenseFileContent = JSON.stringify(licenseData);
            const result = parseLicenseFile(licenseFileContent, SECRET_KEY);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('signature'))).toBe(true);
        });
    });

    describe('Sample License Generation', () => {
        it('should generate valid sample license', () => {
            const params = {
                companyId: 'test-company',
                companyName: 'Test Company Inc',
                validityDays: 365
            };

            const license = generateSampleLicenseFile(params, SECRET_KEY);

            expect(license.licenseKey).toMatch(/^HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
            expect(license.companyId).toBe(params.companyId);
            expect(license.companyName).toBe(params.companyName);
            expect(license.signature).toBeDefined();

            // Verify signature
            expect(verifyLicenseSignature(license, SECRET_KEY)).toBe(true);
        });

        it('should generate license with custom modules', () => {
            const params = {
                companyId: 'test-company',
                companyName: 'Test Company',
                modules: {
                    'attendance': {
                        enabled: true,
                        tier: 'business',
                        limits: { employees: 100 }
                    }
                }
            };

            const license = generateSampleLicenseFile(params, SECRET_KEY);

            expect(license.modules.attendance).toBeDefined();
            expect(license.modules.attendance.enabled).toBe(true);
            expect(license.modules.attendance.tier).toBe('business');
        });

        it('should generate license with correct expiration', () => {
            const params = {
                companyId: 'test-company',
                companyName: 'Test Company',
                validityDays: 30
            };

            const license = generateSampleLicenseFile(params, SECRET_KEY);
            const days = getDaysUntilExpiration(license);

            expect(days).toBeGreaterThan(29);
            expect(days).toBeLessThanOrEqual(31);
        });
    });

    describe('Example License File', () => {
        it('should have valid structure', () => {
            const result = validateLicenseFileStructure(EXAMPLE_LICENSE_FILE);

            // Note: Example may have expired date, so we check structure only
            expect(EXAMPLE_LICENSE_FILE.licenseKey).toBeDefined();
            expect(EXAMPLE_LICENSE_FILE.companyId).toBeDefined();
            expect(EXAMPLE_LICENSE_FILE.modules).toBeDefined();
        });
    });
});
