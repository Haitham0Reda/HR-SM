/**
 * Integration Tests for Life Insurance Module
 * 
 * This test suite validates:
 * - All endpoints work with standardized middleware
 * - Complete role-based access control flow
 * - Tenant isolation across all operations
 * 
 * Requirements: All requirements from insurance-module-multi-tenant-roles spec
 */

import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../../app.js';
import { User } from '../../../models/User.js';
import InsurancePolicy from '../models/InsurancePolicy.js';
import FamilyMember from '../models/FamilyMember.js';
import Claim from '../models/Claim.js';
import { Tenant } from '../../../models/Tenant.js';
import { ROLES, MODULES } from '../../../shared/constants/modules.js';

describe('Life Insurance Module - Integration Tests', () => {
    let tenant1, tenant2;
    let employeeUser1, managerUser1, hrUser1, adminUser1;
    let employeeUser2; // Different tenant
    let employeeToken1, managerToken1, hrToken1, adminToken1, employeeToken2;
    let policy1, policy2;
    let familyMember1;
    let claim1;

    beforeAll(async () => {
        // Create test tenants
        tenant1 = await Tenant.create({
            name: 'Test Tenant 1',
            domain: 'test1.example.com',
            status: 'active',
            subscriptionPlan: 'premium',
            modules: [MODULES.LIFE_INSURANCE],
            settings: {
                modules: {
                    [MODULES.LIFE_INSURANCE]: {
                        enabled: true,
                        features: {
                            policyManagement: true,
                            familyMembers: true,
                            claimsProcessing: true,
                            insuranceReports: true,
                            beneficiaryManagement: true,
                            documentUpload: true
                        }
                    }
                }
            }
        });

        tenant2 = await Tenant.create({
            name: 'Test Tenant 2',
            domain: 'test2.example.com',
            status: 'active',
            subscriptionPlan: 'premium',
            modules: [MODULES.LIFE_INSURANCE],
            settings: {
                modules: {
                    [MODULES.LIFE_INSURANCE]: {
                        enabled: true,
                        features: {
                            policyManagement: true,
                            familyMembers: true,
                            claimsProcessing: true,
                            insuranceReports: true,
                            beneficiaryManagement: true,
                            documentUpload: true
                        }
                    }
                }
            }
        });

        // Create test users for tenant 1
        employeeUser1 = await User.create({
            firstName: 'John',
            lastName: 'Employee',
            email: 'employee1@test1.com',
            employeeId: 'EMP001',
            role: ROLES.EMPLOYEE,
            tenantId: tenant1._id,
            department: new mongoose.Types.ObjectId(),
            position: new mongoose.Types.ObjectId(),
            isActive: true
        });

        managerUser1 = await User.create({
            firstName: 'Jane',
            lastName: 'Manager',
            email: 'manager1@test1.com',
            employeeId: 'MGR001',
            role: ROLES.MANAGER,
            tenantId: tenant1._id,
            department: employeeUser1.department, // Same department as employee
            position: new mongoose.Types.ObjectId(),
            isActive: true
        });

        hrUser1 = await User.create({
            firstName: 'Bob',
            lastName: 'HR',
            email: 'hr1@test1.com',
            employeeId: 'HR001',
            role: ROLES.HR,
            tenantId: tenant1._id,
            department: new mongoose.Types.ObjectId(),
            position: new mongoose.Types.ObjectId(),
            isActive: true
        });

        adminUser1 = await User.create({
            firstName: 'Alice',
            lastName: 'Admin',
            email: 'admin1@test1.com',
            employeeId: 'ADM001',
            role: ROLES.ADMIN,
            tenantId: tenant1._id,
            department: new mongoose.Types.ObjectId(),
            position: new mongoose.Types.ObjectId(),
            isActive: true
        });

        // Create test user for tenant 2
        employeeUser2 = await User.create({
            firstName: 'Mike',
            lastName: 'Employee2',
            email: 'employee2@test2.com',
            employeeId: 'EMP002',
            role: ROLES.EMPLOYEE,
            tenantId: tenant2._id,
            department: new mongoose.Types.ObjectId(),
            position: new mongoose.Types.ObjectId(),
            isActive: true
        });

        // Generate JWT tokens
        const generateToken = (user, tenant) => {
            return jwt.sign(
                { 
                    id: user._id, 
                    tenantId: tenant._id,
                    role: user.role,
                    employeeId: user.employeeId
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );
        };

        employeeToken1 = generateToken(employeeUser1, tenant1);
        managerToken1 = generateToken(managerUser1, tenant1);
        hrToken1 = generateToken(hrUser1, tenant1);
        adminToken1 = generateToken(adminUser1, tenant1);
        employeeToken2 = generateToken(employeeUser2, tenant2);

        // Create test insurance policies
        policy1 = await InsurancePolicy.create({
            employeeId: employeeUser1._id,
            tenantId: tenant1._id,
            policyNumber: 'POL001',
            policyType: 'CAT_A',
            coverageAmount: 100000,
            premium: 500,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            status: 'active'
        });

        policy2 = await InsurancePolicy.create({
            employeeId: employeeUser2._id,
            tenantId: tenant2._id,
            policyNumber: 'POL002',
            policyType: 'CAT_B',
            coverageAmount: 150000,
            premium: 750,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: 'active'
        });

        // Create test family member
        familyMember1 = await FamilyMember.create({
            policyId: policy1._id,
            employeeId: employeeUser1._id,
            tenantId: tenant1._id,
            firstName: 'Jane',
            lastName: 'Doe',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'female',
            relationship: 'spouse',
            coverageAmount: 50000,
            status: 'active'
        });

        // Create test claim
        claim1 = await Claim.create({
            policyId: policy1._id,
            employeeId: employeeUser1._id,
            tenantId: tenant1._id,
            claimantType: 'employee',
            claimantId: employeeUser1._id,
            claimType: 'medical',
            incidentDate: new Date(),
            claimAmount: 5000,
            description: 'Medical claim for treatment',
            status: 'pending',
            priority: 'medium'
        });
    });

    afterAll(async () => {
        // Clean up test data
        await User.deleteMany({ tenantId: { $in: [tenant1._id, tenant2._id] } });
        await InsurancePolicy.deleteMany({ tenantId: { $in: [tenant1._id, tenant2._id] } });
        await FamilyMember.deleteMany({ tenantId: { $in: [tenant1._id, tenant2._id] } });
        await Claim.deleteMany({ tenantId: { $in: [tenant1._id, tenant2._id] } });
        await Tenant.deleteMany({ _id: { $in: [tenant1._id, tenant2._id] } });
    });

    describe('Middleware Integration', () => {
        test('should require authentication for all endpoints', async () => {
            const endpoints = [
                'GET /api/modules/life-insurance/',
                'GET /api/modules/life-insurance/policies',
                'GET /api/modules/life-insurance/claims',
                'GET /api/modules/life-insurance/family-members'
            ];

            for (const endpoint of endpoints) {
                const [method, path] = endpoint.split(' ');
                const response = await request(app)[method.toLowerCase()](path);
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            }
        });

        test('should require module license for all endpoints', async () => {
            // Create a tenant without life insurance module
            const tenantWithoutModule = await Tenant.create({
                name: 'No Insurance Tenant',
                domain: 'noinsurance.example.com',
                status: 'active',
                subscriptionPlan: 'basic',
                modules: [], // No life insurance module
                settings: {}
            });

            const userWithoutModule = await User.create({
                firstName: 'No',
                lastName: 'Insurance',
                email: 'noinsurance@test.com',
                employeeId: 'NOIN001',
                role: ROLES.EMPLOYEE,
                tenantId: tenantWithoutModule._id,
                department: new mongoose.Types.ObjectId(),
                position: new mongoose.Types.ObjectId(),
                isActive: true
            });

            const tokenWithoutModule = jwt.sign(
                { 
                    id: userWithoutModule._id, 
                    tenantId: tenantWithoutModule._id,
                    role: userWithoutModule.role
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/modules/life-insurance/')
                .set('Authorization', `Bearer ${tokenWithoutModule}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('license');

            // Clean up
            await User.deleteOne({ _id: userWithoutModule._id });
            await Tenant.deleteOne({ _id: tenantWithoutModule._id });
        });

        test('should check tenant status', async () => {
            // Create a suspended tenant
            const suspendedTenant = await Tenant.create({
                name: 'Suspended Tenant',
                domain: 'suspended.example.com',
                status: 'suspended',
                subscriptionPlan: 'premium',
                modules: [MODULES.LIFE_INSURANCE],
                settings: {}
            });

            const suspendedUser = await User.create({
                firstName: 'Suspended',
                lastName: 'User',
                email: 'suspended@test.com',
                employeeId: 'SUS001',
                role: ROLES.EMPLOYEE,
                tenantId: suspendedTenant._id,
                department: new mongoose.Types.ObjectId(),
                position: new mongoose.Types.ObjectId(),
                isActive: true
            });

            const suspendedToken = jwt.sign(
                { 
                    id: suspendedUser._id, 
                    tenantId: suspendedTenant._id,
                    role: suspendedUser.role
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/modules/life-insurance/')
                .set('Authorization', `Bearer ${suspendedToken}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('suspended');

            // Clean up
            await User.deleteOne({ _id: suspendedUser._id });
            await Tenant.deleteOne({ _id: suspendedTenant._id });
        });
    });

    describe('Role-Based Access Control', () => {
        describe('Employee Role Access', () => {
            test('should allow employees to view their own policies', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/policies')
                    .set('Authorization', `Bearer ${employeeToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.policies).toHaveLength(1);
                expect(response.body.data.policies[0]._id).toBe(policy1._id.toString());
            });

            test('should allow employees to create policies for themselves', async () => {
                const policyData = {
                    employeeId: employeeUser1._id.toString(),
                    policyType: 'CAT_B',
                    coverageAmount: 75000,
                    premium: 400,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                };

                const response = await request(app)
                    .post('/api/modules/life-insurance/policies')
                    .set('Authorization', `Bearer ${employeeToken1}`)
                    .send(policyData);

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data.policy.employeeId).toBe(employeeUser1._id.toString());
            });

            test('should prevent employees from accessing other employees policies', async () => {
                const response = await request(app)
                    .get(`/api/modules/life-insurance/policies/${policy2._id}`)
                    .set('Authorization', `Bearer ${employeeToken1}`);

                expect(response.status).toBe(404);
                expect(response.body.success).toBe(false);
            });

            test('should allow employees to manage their own family members', async () => {
                const familyMemberData = {
                    firstName: 'John',
                    lastName: 'Child',
                    dateOfBirth: '2010-01-01',
                    gender: 'male',
                    relationship: 'child',
                    coverageAmount: 25000
                };

                const response = await request(app)
                    .post(`/api/modules/life-insurance/policies/${policy1._id}/family-members`)
                    .set('Authorization', `Bearer ${employeeToken1}`)
                    .send(familyMemberData);

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data.familyMember.firstName).toBe('John');
            });

            test('should allow employees to create claims for their own policies', async () => {
                const claimData = {
                    policyId: policy1._id.toString(),
                    claimantType: 'employee',
                    claimantId: employeeUser1._id.toString(),
                    claimType: 'medical',
                    incidentDate: new Date().toISOString(),
                    claimAmount: 2000,
                    description: 'Medical treatment claim for employee'
                };

                const response = await request(app)
                    .post('/api/modules/life-insurance/claims')
                    .set('Authorization', `Bearer ${employeeToken1}`)
                    .send(claimData);

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
                expect(response.body.data.claim.employeeId).toBe(employeeUser1._id.toString());
            });
        });

        describe('Manager Role Access', () => {
            test('should allow managers to view policies for employees in their department', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/policies')
                    .set('Authorization', `Bearer ${managerToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.policies.length).toBeGreaterThan(0);
                
                // Should include employee's policy since they're in the same department
                const employeePolicy = response.body.data.policies.find(
                    p => p.employeeId === employeeUser1._id.toString()
                );
                expect(employeePolicy).toBeDefined();
            });

            test('should allow managers to create policies for employees in their department', async () => {
                const policyData = {
                    employeeId: employeeUser1._id.toString(),
                    policyType: 'CAT_C',
                    coverageAmount: 200000,
                    premium: 1000,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                };

                const response = await request(app)
                    .post('/api/modules/life-insurance/policies')
                    .set('Authorization', `Bearer ${managerToken1}`)
                    .send(policyData);

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
            });

            test('should allow managers to update policies', async () => {
                const updateData = {
                    coverageAmount: 110000,
                    premium: 550
                };

                const response = await request(app)
                    .put(`/api/modules/life-insurance/policies/${policy1._id}`)
                    .set('Authorization', `Bearer ${managerToken1}`)
                    .send(updateData);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.policy.coverageAmount).toBe(110000);
            });

            test('should allow managers to view statistics', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/policies/statistics')
                    .set('Authorization', `Bearer ${managerToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('totalPolicies');
            });
        });

        describe('HR Role Access', () => {
            test('should allow HR to view all policies within tenant', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/policies')
                    .set('Authorization', `Bearer ${hrToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.policies.length).toBeGreaterThan(0);
            });

            test('should allow HR to access all claims within tenant', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/claims')
                    .set('Authorization', `Bearer ${hrToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            test('should allow HR to view module configuration', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/config')
                    .set('Authorization', `Bearer ${hrToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveProperty('moduleConfig');
            });
        });

        describe('Admin Role Access', () => {
            test('should allow admins to delete policies', async () => {
                // Create a policy to delete
                const testPolicy = await InsurancePolicy.create({
                    employeeId: employeeUser1._id,
                    tenantId: tenant1._id,
                    policyNumber: 'POL_DELETE_TEST',
                    policyType: 'CAT_A',
                    coverageAmount: 50000,
                    premium: 250,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    status: 'active'
                });

                const response = await request(app)
                    .delete(`/api/modules/life-insurance/policies/${testPolicy._id}`)
                    .set('Authorization', `Bearer ${adminToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            test('should allow admins to update module settings', async () => {
                const settingsData = {
                    settings: {
                        emailNotifications: true,
                        autoApproveSmallClaims: false,
                        smallClaimThreshold: 1000,
                        requireDocumentsForClaims: true,
                        maxFamilyMembers: 10
                    }
                };

                const response = await request(app)
                    .put('/api/modules/life-insurance/config/settings')
                    .set('Authorization', `Bearer ${adminToken1}`)
                    .send(settingsData);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            test('should allow admins to clear config cache', async () => {
                const response = await request(app)
                    .post('/api/modules/life-insurance/config/cache/clear')
                    .set('Authorization', `Bearer ${adminToken1}`);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        describe('Role Hierarchy Enforcement', () => {
            test('should prevent employees from accessing manager-only endpoints', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/policies/statistics')
                    .set('Authorization', `Bearer ${employeeToken1}`);

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
            });

            test('should prevent managers from accessing admin-only endpoints', async () => {
                const response = await request(app)
                    .delete(`/api/modules/life-insurance/policies/${policy1._id}`)
                    .set('Authorization', `Bearer ${managerToken1}`);

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
            });

            test('should prevent employees from accessing HR-only endpoints', async () => {
                const response = await request(app)
                    .get('/api/modules/life-insurance/config')
                    .set('Authorization', `Bearer ${employeeToken1}`);

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
            });
        });
    });

    describe('Tenant Isolation', () => {
        test('should prevent cross-tenant data access for policies', async () => {
            // Employee from tenant1 trying to access policy from tenant2
            const response = await request(app)
                .get(`/api/modules/life-insurance/policies/${policy2._id}`)
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        test('should prevent cross-tenant data access for claims', async () => {
            // Create a claim for tenant2
            const claim2 = await Claim.create({
                policyId: policy2._id,
                employeeId: employeeUser2._id,
                tenantId: tenant2._id,
                claimantType: 'employee',
                claimantId: employeeUser2._id,
                claimType: 'medical',
                incidentDate: new Date(),
                claimAmount: 3000,
                description: 'Medical claim for tenant 2',
                status: 'pending',
                priority: 'medium'
            });

            // Employee from tenant1 trying to access claim from tenant2
            const response = await request(app)
                .get(`/api/modules/life-insurance/claims/${claim2._id}`)
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        test('should prevent cross-tenant data access for family members', async () => {
            // Create a family member for tenant2
            const familyMember2 = await FamilyMember.create({
                policyId: policy2._id,
                employeeId: employeeUser2._id,
                tenantId: tenant2._id,
                firstName: 'Bob',
                lastName: 'Smith',
                dateOfBirth: new Date('1985-01-01'),
                gender: 'male',
                relationship: 'spouse',
                coverageAmount: 40000,
                status: 'active'
            });

            // Employee from tenant1 trying to access family member from tenant2
            const response = await request(app)
                .get(`/api/modules/life-insurance/family-members/${familyMember2._id}`)
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        test('should ensure tenant scoping in list endpoints', async () => {
            // Get policies for tenant1 user
            const response1 = await request(app)
                .get('/api/modules/life-insurance/policies')
                .set('Authorization', `Bearer ${hrToken1}`);

            // Get policies for tenant2 user
            const response2 = await request(app)
                .get('/api/modules/life-insurance/policies')
                .set('Authorization', `Bearer ${employeeToken2}`);

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);

            // Verify that each tenant only sees their own data
            const tenant1Policies = response1.body.data.policies;
            const tenant2Policies = response2.body.data.policies;

            // All policies in tenant1 response should belong to tenant1
            tenant1Policies.forEach(policy => {
                expect(policy.tenantId).toBe(tenant1._id.toString());
            });

            // All policies in tenant2 response should belong to tenant2
            tenant2Policies.forEach(policy => {
                expect(policy.tenantId).toBe(tenant2._id.toString());
            });

            // No overlap between tenant data
            const tenant1PolicyIds = tenant1Policies.map(p => p._id);
            const tenant2PolicyIds = tenant2Policies.map(p => p._id);
            const intersection = tenant1PolicyIds.filter(id => tenant2PolicyIds.includes(id));
            expect(intersection).toHaveLength(0);
        });

        test('should ensure tenant scoping in employee search', async () => {
            // Search employees from tenant1
            const response1 = await request(app)
                .get('/api/modules/life-insurance/employees/search?q=Employee')
                .set('Authorization', `Bearer ${hrToken1}`);

            // Search employees from tenant2
            const response2 = await request(app)
                .get('/api/modules/life-insurance/employees/search?q=Employee')
                .set('Authorization', `Bearer ${employeeToken2}`);

            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);

            const tenant1Employees = response1.body.data.employees;
            const tenant2Employees = response2.body.data.employees;

            // Verify tenant isolation in employee search
            tenant1Employees.forEach(employee => {
                expect(employee.tenantId).toBe(tenant1._id.toString());
            });

            tenant2Employees.forEach(employee => {
                expect(employee.tenantId).toBe(tenant2._id.toString());
            });
        });
    });

    describe('Error Handling Standardization', () => {
        test('should return consistent error format for validation errors', async () => {
            const invalidPolicyData = {
                employeeId: 'invalid-id',
                policyType: 'INVALID_TYPE',
                coverageAmount: -1000,
                premium: 'not-a-number'
            };

            const response = await request(app)
                .post('/api/modules/life-insurance/policies')
                .set('Authorization', `Bearer ${employeeToken1}`)
                .send(invalidPolicyData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
        });

        test('should return consistent error format for not found errors', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            
            const response = await request(app)
                .get(`/api/modules/life-insurance/policies/${nonExistentId}`)
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
        });

        test('should return consistent error format for authorization errors', async () => {
            const response = await request(app)
                .delete(`/api/modules/life-insurance/policies/${policy1._id}`)
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Feature Availability', () => {
        test('should respect feature availability configuration', async () => {
            const response = await request(app)
                .get('/api/modules/life-insurance/config/features')
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('availableFeatures');
            expect(response.body.data.availableFeatures).toHaveProperty('policyManagement');
            expect(response.body.data.availableFeatures).toHaveProperty('familyMembers');
            expect(response.body.data.availableFeatures).toHaveProperty('claimsProcessing');
        });

        test('should check individual feature availability', async () => {
            const response = await request(app)
                .get('/api/modules/life-insurance/config/features/policyManagement')
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('available');
            expect(response.body.data.available).toBe(true);
        });
    });

    describe('Module Configuration Integration', () => {
        test('should provide module availability information', async () => {
            const response = await request(app)
                .get('/api/modules/life-insurance/config/availability')
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('moduleAvailable');
            expect(response.body.data.moduleAvailable).toBe(true);
        });

        test('should include module configuration in root endpoint', async () => {
            const response = await request(app)
                .get('/api/modules/life-insurance/')
                .set('Authorization', `Bearer ${employeeToken1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('tenant');
            expect(response.body.data).toHaveProperty('features');
            expect(response.body.data).toHaveProperty('availableFeatures');
            expect(response.body.data.tenant).toHaveProperty('subscriptionPlan');
            expect(response.body.data.tenant).toHaveProperty('subscriptionStatus');
        });
    });
});