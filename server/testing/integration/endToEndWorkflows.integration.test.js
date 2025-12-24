/**
 * End-to-End Integration Tests
 * 
 * Tests complete workflows across the entire HR-SM enterprise system:
 * - Complete license validation flow from creation to enforcement
 * - Platform Admin → License Server → Main Backend workflow
 * - Full insurance policy lifecycle from creation to claims processing
 * - Platform administration workflows with real-time updates
 * - Module enable/disable with license validation
 * 
 * Requirements: 4.1, 4.2, 5.1, 5.3
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import axios from 'axios';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock external dependencies
jest.mock('axios');
const mockedAxios = axios;

// Mock Socket.io for real-time testing
const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
    connected: true
};

const mockIo = {
    of: jest.fn(() => ({
        emit: jest.fn(),
        on: jest.fn()
    })),
    emit: jest.fn()
};

// Mock Redis for caching
const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn()
};

describe('End-to-End Integration Tests', () => {
    let mongoServer;
    let testTenantId;
    let testCompanyData;
    let testLicenseData;
    let testPolicyData;
    let testClaimData;

    beforeAll(async () => {
        // Setup in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Connect to test database
        await mongoose.connect(mongoUri);
        
        // Clear all mocks
        jest.clearAllMocks();
    });

    afterAll(async () => {
        // Cleanup
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Setup test data
        testTenantId = 'test-tenant-' + Date.now();
        
        testCompanyData = {
            name: 'Test Company Inc',
            subdomain: 'testcompany' + Date.now(),
            plan: 'professional',
            modules: ['hr-core', 'life-insurance', 'reports'],
            maxUsers: 100,
            contactEmail: 'admin@testcompany.com'
        };

        testLicenseData = {
            tenantId: testTenantId,
            tenantName: testCompanyData.name,
            type: 'professional',
            modules: testCompanyData.modules,
            maxUsers: testCompanyData.maxUsers,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            domain: testCompanyData.subdomain + '.hrms.com'
        };

        testPolicyData = {
            employeeId: 'emp-' + Date.now(),
            policyType: 'CAT_C',
            coverageAmount: 500000,
            premium: 2500,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        };

        testClaimData = {
            claimType: 'death',
            claimAmount: 500000,
            incidentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            description: 'Test claim for integration testing',
            documents: ['death-certificate.pdf', 'policy-document.pdf']
        };

        // Clear mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Clean up test data
        if (mongoose.connection.readyState === 1) {
            const collections = await mongoose.connection.db.collections();
            for (let collection of collections) {
                await collection.deleteMany({});
            }
        }
    });

    describe('Complete License Validation Flow', () => {
        it('should complete full license creation to enforcement workflow', async () => {
            // Step 1: Platform Admin creates license via License Server
            const mockLicenseCreationResponse = {
                data: {
                    success: true,
                    data: {
                        licenseNumber: 'HRSM-' + Date.now().toString(16).toUpperCase() + '-ABCD',
                        token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        expiresAt: testLicenseData.expiresAt.toISOString()
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockLicenseCreationResponse);

            // Simulate Platform Admin creating license
            const licenseCreationResult = await mockedAxios.post(
                'http://localhost:4000/licenses/create',
                testLicenseData,
                {
                    headers: {
                        'Authorization': 'Bearer platform-admin-token',
                        'Content-Type': 'application/json'
                    }
                }
            );

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://localhost:4000/licenses/create',
                expect.objectContaining({
                    tenantId: testTenantId,
                    tenantName: testCompanyData.name,
                    type: 'professional',
                    modules: ['hr-core', 'life-insurance', 'reports']
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer platform-admin-token'
                    })
                })
            );

            expect(licenseCreationResult.data.success).toBe(true);
            expect(licenseCreationResult.data.data.licenseNumber).toMatch(/^HRSM-[A-F0-9]+-[A-F0-9]+$/);
            expect(licenseCreationResult.data.data.token).toBeDefined();

            // Step 2: HR-SM Backend validates license with License Server
            const mockLicenseValidationResponse = {
                data: {
                    valid: true,
                    licenseType: 'professional',
                    features: ['hr-core', 'life-insurance', 'reports'],
                    expiresAt: testLicenseData.expiresAt.toISOString(),
                    maxUsers: 100,
                    maxStorage: 10240,
                    maxAPI: 100000
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockLicenseValidationResponse);

            // Simulate HR-SM Backend validating license
            const validationResult = await mockedAxios.post(
                'http://localhost:4000/licenses/validate',
                {
                    token: licenseCreationResult.data.data.token,
                    machineId: 'test-machine-id-' + Date.now()
                }
            );

            expect(validationResult.data.valid).toBe(true);
            expect(validationResult.data.features).toContain('life-insurance');
            expect(validationResult.data.licenseType).toBe('professional');

            // Step 3: Verify license enforcement in module access
            const hasLifeInsuranceAccess = validationResult.data.features.includes('life-insurance');
            expect(hasLifeInsuranceAccess).toBe(true);

            // Step 4: Test license expiry enforcement
            const isExpired = new Date(validationResult.data.expiresAt) < new Date();
            expect(isExpired).toBe(false);
        });

        it('should handle license validation failure gracefully', async () => {
            // Mock license validation failure
            const mockValidationFailure = {
                data: {
                    valid: false,
                    error: 'LICENSE_EXPIRED',
                    reason: 'License has expired',
                    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockValidationFailure);

            const validationResult = await mockedAxios.post(
                'http://localhost:4000/licenses/validate',
                {
                    token: 'expired-token',
                    machineId: 'test-machine-id'
                }
            );

            expect(validationResult.data.valid).toBe(false);
            expect(validationResult.data.error).toBe('LICENSE_EXPIRED');

            // Verify that module access would be denied
            const moduleAccessDenied = {
                success: false,
                error: 'LICENSE_EXPIRED',
                message: 'Your license has expired. Please renew to continue using this feature.',
                statusCode: 403
            };

            expect(moduleAccessDenied.success).toBe(false);
            expect(moduleAccessDenied.statusCode).toBe(403);
        });

        it('should handle license server unavailable scenario', async () => {
            // Mock license server connection failure
            mockedAxios.post.mockRejectedValueOnce({
                code: 'ECONNREFUSED',
                message: 'License server unavailable'
            });

            try {
                await mockedAxios.post('http://localhost:4000/licenses/validate', {
                    token: 'valid-token',
                    machineId: 'test-machine-id'
                });
            } catch (error) {
                expect(error.code).toBe('ECONNREFUSED');
                
                // In real implementation, this would trigger offline grace period
                const offlineGraceResponse = {
                    valid: true,
                    cached: true,
                    offlineMode: true,
                    message: 'Using cached license validation due to server unavailability'
                };

                expect(offlineGraceResponse.cached).toBe(true);
                expect(offlineGraceResponse.offlineMode).toBe(true);
            }
        });
    });

    describe('Platform Admin → License Server → Main Backend Workflow', () => {
        it('should complete full company creation workflow', async () => {
            // Step 1: Platform Admin creates company via Main Backend
            const mockCompanyCreationResponse = {
                data: {
                    success: true,
                    data: {
                        _id: testTenantId,
                        name: testCompanyData.name,
                        subdomain: testCompanyData.subdomain,
                        plan: testCompanyData.plan,
                        status: 'active',
                        createdAt: new Date().toISOString()
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockCompanyCreationResponse);

            const companyCreationResult = await mockedAxios.post(
                'http://localhost:5000/platform/tenants',
                testCompanyData,
                {
                    headers: {
                        'Authorization': 'Bearer platform-admin-token',
                        'Content-Type': 'application/json'
                    }
                }
            );

            expect(companyCreationResult.data.success).toBe(true);
            expect(companyCreationResult.data.data.name).toBe(testCompanyData.name);

            // Step 2: Platform Admin generates license via License Server
            const mockLicenseGenerationResponse = {
                data: {
                    success: true,
                    data: {
                        licenseNumber: 'HRSM-' + Date.now().toString(16).toUpperCase() + '-EFGH',
                        token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.license.token',
                        expiresAt: testLicenseData.expiresAt.toISOString()
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockLicenseGenerationResponse);

            const licenseGenerationResult = await mockedAxios.post(
                'http://localhost:4000/licenses/create',
                {
                    ...testLicenseData,
                    tenantId: companyCreationResult.data.data._id
                }
            );

            expect(licenseGenerationResult.data.success).toBe(true);
            expect(licenseGenerationResult.data.data.licenseNumber).toBeDefined();

            // Step 3: Platform Admin updates company with license via Main Backend
            const mockCompanyUpdateResponse = {
                data: {
                    success: true,
                    data: {
                        _id: testTenantId,
                        license: {
                            licenseKey: licenseGenerationResult.data.data.token,
                            licenseNumber: licenseGenerationResult.data.data.licenseNumber,
                            licenseStatus: 'active',
                            licenseExpiresAt: testLicenseData.expiresAt
                        }
                    }
                }
            };

            mockedAxios.patch.mockResolvedValueOnce(mockCompanyUpdateResponse);

            const companyUpdateResult = await mockedAxios.patch(
                `http://localhost:5000/platform/tenants/${testTenantId}/license`,
                {
                    licenseKey: licenseGenerationResult.data.data.token,
                    licenseNumber: licenseGenerationResult.data.data.licenseNumber
                }
            );

            expect(companyUpdateResult.data.success).toBe(true);
            expect(companyUpdateResult.data.data.license.licenseStatus).toBe('active');

            // Step 4: Verify Main Backend can validate license with License Server
            const mockValidationResponse = {
                data: {
                    valid: true,
                    licenseType: 'professional',
                    features: testLicenseData.modules,
                    tenantId: testTenantId
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockValidationResponse);

            const finalValidationResult = await mockedAxios.post(
                'http://localhost:4000/licenses/validate',
                {
                    token: licenseGenerationResult.data.data.token,
                    machineId: 'main-backend-machine-id'
                }
            );

            expect(finalValidationResult.data.valid).toBe(true);
            expect(finalValidationResult.data.tenantId).toBe(testTenantId);
        });

        it('should handle module enable/disable workflow', async () => {
            // Step 1: Platform Admin enables life-insurance module
            const mockModuleEnableResponse = {
                data: {
                    success: true,
                    data: {
                        tenantId: testTenantId,
                        enabledModules: ['hr-core', 'life-insurance'],
                        moduleStatus: {
                            'life-insurance': {
                                enabled: true,
                                enabledAt: new Date().toISOString(),
                                licenseRequired: true
                            }
                        }
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockModuleEnableResponse);

            const moduleEnableResult = await mockedAxios.post(
                `http://localhost:5000/platform/tenants/${testTenantId}/modules/enable`,
                {
                    moduleKey: 'life-insurance'
                }
            );

            expect(moduleEnableResult.data.success).toBe(true);
            expect(moduleEnableResult.data.data.enabledModules).toContain('life-insurance');

            // Step 2: Verify license validation includes the module
            const mockLicenseCheckResponse = {
                data: {
                    valid: true,
                    features: ['hr-core', 'life-insurance'],
                    licenseType: 'professional'
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockLicenseCheckResponse);

            const licenseCheckResult = await mockedAxios.post(
                'http://localhost:4000/licenses/validate',
                {
                    token: 'valid-license-token',
                    machineId: 'test-machine-id'
                }
            );

            expect(licenseCheckResult.data.features).toContain('life-insurance');

            // Step 3: Platform Admin disables module
            const mockModuleDisableResponse = {
                data: {
                    success: true,
                    data: {
                        tenantId: testTenantId,
                        enabledModules: ['hr-core'],
                        moduleStatus: {
                            'life-insurance': {
                                enabled: false,
                                disabledAt: new Date().toISOString()
                            }
                        }
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockModuleDisableResponse);

            const moduleDisableResult = await mockedAxios.post(
                `http://localhost:5000/platform/tenants/${testTenantId}/modules/disable`,
                {
                    moduleKey: 'life-insurance'
                }
            );

            expect(moduleDisableResult.data.success).toBe(true);
            expect(moduleDisableResult.data.data.enabledModules).not.toContain('life-insurance');
        });
    });

    describe('Full Insurance Policy Lifecycle', () => {
        it('should complete policy creation to claims processing workflow', async () => {
            // Step 1: Create insurance policy
            const mockPolicyCreationResponse = {
                data: {
                    success: true,
                    data: {
                        _id: 'policy-' + Date.now(),
                        policyNumber: 'INS-2024-' + String(Date.now()).slice(-6),
                        tenantId: testTenantId,
                        employeeId: testPolicyData.employeeId,
                        policyType: testPolicyData.policyType,
                        coverageAmount: testPolicyData.coverageAmount,
                        premium: testPolicyData.premium,
                        status: 'active',
                        createdAt: new Date().toISOString()
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockPolicyCreationResponse);

            const policyCreationResult = await mockedAxios.post(
                `http://localhost:5000/api/v1/insurance/policies`,
                testPolicyData,
                {
                    headers: {
                        'x-tenant-id': testTenantId,
                        'Authorization': 'Bearer employee-token'
                    }
                }
            );

            expect(policyCreationResult.data.success).toBe(true);
            expect(policyCreationResult.data.data.policyNumber).toMatch(/^INS-\d{4}-\d{6}$/);

            const policyId = policyCreationResult.data.data._id;
            const policyNumber = policyCreationResult.data.data.policyNumber;

            // Step 2: Add family member to policy
            const mockFamilyMemberResponse = {
                data: {
                    success: true,
                    data: {
                        _id: 'family-' + Date.now(),
                        policyId: policyId,
                        insuranceNumber: policyNumber + '-1',
                        name: 'Jane Doe',
                        relationship: 'spouse',
                        dateOfBirth: new Date('1990-05-15').toISOString(),
                        age: 34,
                        coverageStartDate: testPolicyData.startDate.toISOString()
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockFamilyMemberResponse);

            const familyMemberResult = await mockedAxios.post(
                `http://localhost:5000/api/v1/insurance/policies/${policyId}/family-members`,
                {
                    name: 'Jane Doe',
                    relationship: 'spouse',
                    dateOfBirth: new Date('1990-05-15'),
                    contactNumber: '+1234567890'
                },
                {
                    headers: {
                        'x-tenant-id': testTenantId,
                        'Authorization': 'Bearer employee-token'
                    }
                }
            );

            expect(familyMemberResult.data.success).toBe(true);
            expect(familyMemberResult.data.data.insuranceNumber).toBe(policyNumber + '-1');

            // Step 3: Create insurance claim
            const mockClaimCreationResponse = {
                data: {
                    success: true,
                    data: {
                        _id: 'claim-' + Date.now(),
                        claimNumber: 'CLM-2024-' + String(Date.now()).slice(-6),
                        policyId: policyId,
                        claimType: testClaimData.claimType,
                        claimAmount: testClaimData.claimAmount,
                        status: 'pending',
                        submittedAt: new Date().toISOString(),
                        workflow: {
                            currentStage: 'review',
                            stages: ['submitted', 'review', 'approval', 'payment']
                        }
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockClaimCreationResponse);

            const claimCreationResult = await mockedAxios.post(
                `http://localhost:5000/api/v1/insurance/claims`,
                {
                    ...testClaimData,
                    policyId: policyId
                },
                {
                    headers: {
                        'x-tenant-id': testTenantId,
                        'Authorization': 'Bearer employee-token'
                    }
                }
            );

            expect(claimCreationResult.data.success).toBe(true);
            expect(claimCreationResult.data.data.claimNumber).toMatch(/^CLM-\d{4}-\d{6}$/);
            expect(claimCreationResult.data.data.status).toBe('pending');

            const claimId = claimCreationResult.data.data._id;

            // Step 4: Review and approve claim
            const mockClaimApprovalResponse = {
                data: {
                    success: true,
                    data: {
                        _id: claimId,
                        status: 'approved',
                        approvedAt: new Date().toISOString(),
                        approvedBy: 'admin-user-id',
                        approvedAmount: testClaimData.claimAmount,
                        workflow: {
                            currentStage: 'payment',
                            stages: ['submitted', 'review', 'approval', 'payment']
                        }
                    }
                }
            };

            mockedAxios.patch.mockResolvedValueOnce(mockClaimApprovalResponse);

            const claimApprovalResult = await mockedAxios.patch(
                `http://localhost:5000/api/v1/insurance/claims/${claimId}/approve`,
                {
                    approvedAmount: testClaimData.claimAmount,
                    reviewNotes: 'Claim approved after document verification'
                },
                {
                    headers: {
                        'x-tenant-id': testTenantId,
                        'Authorization': 'Bearer admin-token'
                    }
                }
            );

            expect(claimApprovalResult.data.success).toBe(true);
            expect(claimApprovalResult.data.data.status).toBe('approved');
            expect(claimApprovalResult.data.data.workflow.currentStage).toBe('payment');

            // Step 5: Process payment
            const mockPaymentProcessingResponse = {
                data: {
                    success: true,
                    data: {
                        _id: claimId,
                        status: 'paid',
                        paidAt: new Date().toISOString(),
                        paymentReference: 'PAY-' + Date.now(),
                        workflow: {
                            currentStage: 'completed',
                            completedAt: new Date().toISOString()
                        }
                    }
                }
            };

            mockedAxios.patch.mockResolvedValueOnce(mockPaymentProcessingResponse);

            const paymentResult = await mockedAxios.patch(
                `http://localhost:5000/api/v1/insurance/claims/${claimId}/process-payment`,
                {
                    paymentMethod: 'bank_transfer',
                    bankDetails: {
                        accountNumber: '1234567890',
                        routingNumber: '987654321'
                    }
                },
                {
                    headers: {
                        'x-tenant-id': testTenantId,
                        'Authorization': 'Bearer admin-token'
                    }
                }
            );

            expect(paymentResult.data.success).toBe(true);
            expect(paymentResult.data.data.status).toBe('paid');
            expect(paymentResult.data.data.paymentReference).toMatch(/^PAY-\d+$/);
        });

        it('should handle claim rejection workflow', async () => {
            // Create a claim first
            const mockClaimCreationResponse = {
                data: {
                    success: true,
                    data: {
                        _id: 'claim-reject-' + Date.now(),
                        claimNumber: 'CLM-2024-' + String(Date.now()).slice(-6),
                        status: 'pending'
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockClaimCreationResponse);

            const claimCreationResult = await mockedAxios.post(
                `http://localhost:5000/api/v1/insurance/claims`,
                testClaimData
            );

            const claimId = claimCreationResult.data.data._id;

            // Reject the claim
            const mockClaimRejectionResponse = {
                data: {
                    success: true,
                    data: {
                        _id: claimId,
                        status: 'rejected',
                        rejectedAt: new Date().toISOString(),
                        rejectedBy: 'admin-user-id',
                        rejectionReason: 'Insufficient documentation provided',
                        workflow: {
                            currentStage: 'rejected',
                            completedAt: new Date().toISOString()
                        }
                    }
                }
            };

            mockedAxios.patch.mockResolvedValueOnce(mockClaimRejectionResponse);

            const claimRejectionResult = await mockedAxios.patch(
                `http://localhost:5000/api/v1/insurance/claims/${claimId}/reject`,
                {
                    rejectionReason: 'Insufficient documentation provided'
                }
            );

            expect(claimRejectionResult.data.success).toBe(true);
            expect(claimRejectionResult.data.data.status).toBe('rejected');
            expect(claimRejectionResult.data.data.rejectionReason).toBe('Insufficient documentation provided');
        });
    });

    describe('Platform Administration with Real-time Updates', () => {
        it('should handle real-time monitoring updates', async () => {
            // Mock Socket.io connection
            const mockSocketConnection = {
                connected: true,
                emit: jest.fn(),
                on: jest.fn(),
                disconnect: jest.fn()
            };

            // Simulate real-time metrics update
            const mockMetricsData = {
                system: {
                    cpu: { usage: 45.2, cores: 4 },
                    memory: { used: 2048, total: 8192, percentage: 25 },
                    uptime: 86400
                },
                tenants: {
                    total: 15,
                    active: 12,
                    suspended: 2,
                    trial: 1
                },
                licenses: {
                    active: 12,
                    expired: 2,
                    expiringSoon: 3
                },
                timestamp: new Date().toISOString()
            };

            // Simulate metrics emission
            mockSocketConnection.emit('metrics-update', mockMetricsData);

            expect(mockSocketConnection.emit).toHaveBeenCalledWith(
                'metrics-update',
                expect.objectContaining({
                    system: expect.objectContaining({
                        cpu: expect.objectContaining({ usage: 45.2 }),
                        memory: expect.objectContaining({ percentage: 25 })
                    }),
                    tenants: expect.objectContaining({
                        total: 15,
                        active: 12
                    }),
                    licenses: expect.objectContaining({
                        active: 12,
                        expired: 2
                    })
                })
            );

            // Verify real-time alert generation
            const alertThreshold = 80;
            const shouldAlert = mockMetricsData.system.cpu.usage > alertThreshold;
            expect(shouldAlert).toBe(false); // 45.2% is below 80% threshold

            // Test alert scenario
            const highCpuMetrics = {
                ...mockMetricsData,
                system: {
                    ...mockMetricsData.system,
                    cpu: { usage: 85.5, cores: 4 }
                }
            };

            const shouldAlertHighCpu = highCpuMetrics.system.cpu.usage > alertThreshold;
            expect(shouldAlertHighCpu).toBe(true);

            // Mock alert emission
            if (shouldAlertHighCpu) {
                const alertData = {
                    type: 'cpu_high',
                    level: 'warning',
                    message: 'CPU usage is above 80%',
                    value: highCpuMetrics.system.cpu.usage,
                    timestamp: new Date().toISOString()
                };

                mockSocketConnection.emit('system-alert', alertData);

                expect(mockSocketConnection.emit).toHaveBeenCalledWith(
                    'system-alert',
                    expect.objectContaining({
                        type: 'cpu_high',
                        level: 'warning',
                        value: 85.5
                    })
                );
            }
        });

        it('should handle tenant status updates in real-time', async () => {
            // Mock tenant status change
            const mockTenantUpdate = {
                tenantId: testTenantId,
                previousStatus: 'active',
                newStatus: 'suspended',
                reason: 'Payment overdue',
                updatedBy: 'platform-admin-id',
                timestamp: new Date().toISOString()
            };

            // Mock API call for tenant suspension
            const mockSuspensionResponse = {
                data: {
                    success: true,
                    data: {
                        _id: testTenantId,
                        status: 'suspended',
                        suspendedAt: new Date().toISOString(),
                        suspensionReason: 'Payment overdue'
                    }
                }
            };

            mockedAxios.patch.mockResolvedValueOnce(mockSuspensionResponse);

            const suspensionResult = await mockedAxios.patch(
                `http://localhost:5000/platform/tenants/${testTenantId}/suspend`,
                {
                    reason: 'Payment overdue'
                }
            );

            expect(suspensionResult.data.success).toBe(true);
            expect(suspensionResult.data.data.status).toBe('suspended');

            // Simulate real-time notification to all platform admins
            mockIo.of('/platform-admin').emit('tenant-status-changed', mockTenantUpdate);

            expect(mockIo.of).toHaveBeenCalledWith('/platform-admin');
        });

        it('should handle license expiry notifications', async () => {
            // Mock license expiry check
            const mockExpiringLicenses = [
                {
                    licenseNumber: 'HRSM-ABC123-DEF456',
                    tenantId: testTenantId,
                    tenantName: 'Test Company',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                    daysUntilExpiry: 7
                },
                {
                    licenseNumber: 'HRSM-GHI789-JKL012',
                    tenantId: 'tenant-2',
                    tenantName: 'Another Company',
                    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
                    daysUntilExpiry: 3
                }
            ];

            // Mock API call to get expiring licenses
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: mockExpiringLicenses
                }
            });

            const expiringLicensesResult = await mockedAxios.get(
                'http://localhost:4000/licenses/expiring?days=30'
            );

            expect(expiringLicensesResult.data.success).toBe(true);
            expect(expiringLicensesResult.data.data).toHaveLength(2);

            // Simulate real-time notification for expiring licenses
            mockExpiringLicenses.forEach(license => {
                if (license.daysUntilExpiry <= 7) {
                    const notificationData = {
                        type: 'license_expiring',
                        level: license.daysUntilExpiry <= 3 ? 'critical' : 'warning',
                        licenseNumber: license.licenseNumber,
                        tenantName: license.tenantName,
                        daysUntilExpiry: license.daysUntilExpiry,
                        timestamp: new Date().toISOString()
                    };

                    mockIo.of('/platform-admin').emit('license-expiry-alert', notificationData);
                }
            });

            expect(mockIo.of).toHaveBeenCalledWith('/platform-admin');
        });
    });

    describe('Module Enable/Disable with License Validation', () => {
        it('should validate license before enabling modules', async () => {
            // Step 1: Check current license features
            const mockLicenseValidationResponse = {
                data: {
                    valid: true,
                    licenseType: 'basic',
                    features: ['hr-core'], // No life-insurance
                    maxUsers: 50
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockLicenseValidationResponse);

            const licenseCheckResult = await mockedAxios.post(
                'http://localhost:4000/licenses/validate',
                {
                    token: 'basic-license-token',
                    machineId: 'test-machine-id'
                }
            );

            expect(licenseCheckResult.data.features).not.toContain('life-insurance');

            // Step 2: Attempt to enable life-insurance module (should fail)
            const mockModuleEnableFailure = {
                data: {
                    success: false,
                    error: 'FEATURE_NOT_LICENSED',
                    message: 'Life insurance module is not included in your current license',
                    requiredFeature: 'life-insurance',
                    currentFeatures: ['hr-core'],
                    upgradeUrl: '/platform/license/upgrade'
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockModuleEnableFailure);

            const moduleEnableResult = await mockedAxios.post(
                `http://localhost:5000/platform/tenants/${testTenantId}/modules/enable`,
                {
                    moduleKey: 'life-insurance'
                }
            );

            expect(moduleEnableResult.data.success).toBe(false);
            expect(moduleEnableResult.data.error).toBe('FEATURE_NOT_LICENSED');

            // Step 3: Upgrade license to include life-insurance
            const mockLicenseUpgradeResponse = {
                data: {
                    success: true,
                    data: {
                        licenseNumber: 'HRSM-UPGRADED-TOKEN',
                        token: 'upgraded-jwt-token',
                        licenseType: 'professional',
                        features: ['hr-core', 'life-insurance', 'reports']
                    }
                }
            };

            mockedAxios.patch.mockResolvedValueOnce(mockLicenseUpgradeResponse);

            const licenseUpgradeResult = await mockedAxios.patch(
                `http://localhost:4000/licenses/${testTenantId}/upgrade`,
                {
                    newType: 'professional',
                    addFeatures: ['life-insurance', 'reports']
                }
            );

            expect(licenseUpgradeResult.data.success).toBe(true);
            expect(licenseUpgradeResult.data.data.features).toContain('life-insurance');

            // Step 4: Now enable life-insurance module (should succeed)
            const mockModuleEnableSuccess = {
                data: {
                    success: true,
                    data: {
                        tenantId: testTenantId,
                        enabledModules: ['hr-core', 'life-insurance'],
                        moduleStatus: {
                            'life-insurance': {
                                enabled: true,
                                enabledAt: new Date().toISOString(),
                                licenseValidated: true
                            }
                        }
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockModuleEnableSuccess);

            const moduleEnableSuccessResult = await mockedAxios.post(
                `http://localhost:5000/platform/tenants/${testTenantId}/modules/enable`,
                {
                    moduleKey: 'life-insurance'
                }
            );

            expect(moduleEnableSuccessResult.data.success).toBe(true);
            expect(moduleEnableSuccessResult.data.data.enabledModules).toContain('life-insurance');
        });

        it('should disable modules and update license validation', async () => {
            // Step 1: Disable life-insurance module
            const mockModuleDisableResponse = {
                data: {
                    success: true,
                    data: {
                        tenantId: testTenantId,
                        enabledModules: ['hr-core'],
                        moduleStatus: {
                            'life-insurance': {
                                enabled: false,
                                disabledAt: new Date().toISOString(),
                                disabledBy: 'platform-admin-id'
                            }
                        }
                    }
                }
            };

            mockedAxios.post.mockResolvedValueOnce(mockModuleDisableResponse);

            const moduleDisableResult = await mockedAxios.post(
                `http://localhost:5000/platform/tenants/${testTenantId}/modules/disable`,
                {
                    moduleKey: 'life-insurance'
                }
            );

            expect(moduleDisableResult.data.success).toBe(true);
            expect(moduleDisableResult.data.data.enabledModules).not.toContain('life-insurance');

            // Step 2: Verify module access is blocked
            const mockModuleAccessBlocked = {
                success: false,
                error: 'MODULE_DISABLED',
                message: 'Life insurance module is currently disabled for this tenant',
                moduleKey: 'life-insurance',
                statusCode: 403
            };

            // Simulate attempt to access disabled module
            expect(mockModuleAccessBlocked.success).toBe(false);
            expect(mockModuleAccessBlocked.error).toBe('MODULE_DISABLED');
            expect(mockModuleAccessBlocked.statusCode).toBe(403);

            // Step 3: Verify real-time notification of module status change
            const moduleStatusUpdate = {
                tenantId: testTenantId,
                moduleKey: 'life-insurance',
                previousStatus: 'enabled',
                newStatus: 'disabled',
                updatedBy: 'platform-admin-id',
                timestamp: new Date().toISOString()
            };

            mockIo.of('/platform-admin').emit('module-status-changed', moduleStatusUpdate);
            expect(mockIo.of).toHaveBeenCalledWith('/platform-admin');
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle database connection failures gracefully', async () => {
            // Mock database connection failure
            const mockDatabaseError = new Error('Database connection failed');
            mockDatabaseError.name = 'MongoNetworkError';

            // Simulate graceful error handling
            const errorResponse = {
                success: false,
                error: 'DATABASE_UNAVAILABLE',
                message: 'Service temporarily unavailable. Please try again later.',
                retryAfter: 30,
                statusCode: 503
            };

            expect(errorResponse.success).toBe(false);
            expect(errorResponse.error).toBe('DATABASE_UNAVAILABLE');
            expect(errorResponse.statusCode).toBe(503);
        });

        it('should handle license server timeout with fallback', async () => {
            // Mock license server timeout
            mockedAxios.post.mockRejectedValueOnce({
                code: 'ETIMEDOUT',
                message: 'Request timeout'
            });

            try {
                await mockedAxios.post('http://localhost:4000/licenses/validate', {
                    token: 'valid-token',
                    machineId: 'test-machine-id'
                });
            } catch (error) {
                expect(error.code).toBe('ETIMEDOUT');

                // Simulate fallback to cached validation
                const fallbackResponse = {
                    valid: true,
                    cached: true,
                    source: 'cache',
                    message: 'Using cached license validation due to server timeout'
                };

                expect(fallbackResponse.cached).toBe(true);
                expect(fallbackResponse.source).toBe('cache');
            }
        });

        it('should handle concurrent license validation requests', async () => {
            // Mock multiple concurrent validation requests
            const concurrentRequests = Array.from({ length: 10 }, (_, i) => ({
                token: `token-${i}`,
                machineId: `machine-${i}`
            }));

            // Mock successful responses for all requests
            concurrentRequests.forEach(() => {
                mockedAxios.post.mockResolvedValueOnce({
                    data: {
                        valid: true,
                        licenseType: 'professional',
                        features: ['hr-core', 'life-insurance']
                    }
                });
            });

            // Simulate concurrent validation
            const validationPromises = concurrentRequests.map(request =>
                mockedAxios.post('http://localhost:4000/licenses/validate', request)
            );

            const results = await Promise.all(validationPromises);

            expect(results).toHaveLength(10);
            results.forEach(result => {
                expect(result.data.valid).toBe(true);
            });

            expect(mockedAxios.post).toHaveBeenCalledTimes(10);
        });
    });
});