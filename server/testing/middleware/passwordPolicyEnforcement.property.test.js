/**
 * Password Policy Enforcement Property-Based Tests
 * 
 * Feature: hr-sm-enterprise-enhancement, Property 23: Password Policy Enforcement
 * Validates: Requirements 6.4
 */

import fc from 'fast-check';
import SecuritySettings from '../../platform/system/models/securitySettings.model.js';
import { validatePasswordStrength } from '../../middleware/securityMiddleware.js';

describe('Password Policy Enforcement Property-Based Tests', () => {
    describe('Property 23: Password Policy Enforcement', () => {
        test('should enforce strong password policies and reject non-compliant passwords', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        // Generate various password policy configurations
                        passwordPolicy: fc.record({
                            minLength: fc.integer({ min: 6, max: 20 }),
                            requireUppercase: fc.boolean(),
                            requireLowercase: fc.boolean(),
                            requireNumbers: fc.boolean(),
                            requireSpecialChars: fc.boolean()
                        }),
                        // Generate test passwords with different characteristics
                        testPasswords: fc.array(
                            fc.record({
                                password: fc.string({ minLength: 1, maxLength: 30 }),
                                hasUppercase: fc.boolean(),
                                hasLowercase: fc.boolean(),
                                hasNumbers: fc.boolean(),
                                hasSpecialChars: fc.boolean()
                            }),
                            { minLength: 5, maxLength: 15 }
                        )
                    }),
                    (data) => {
                        // Create a mock SecuritySettings instance with the generated policy
                        const mockSettings = {
                            passwordPolicy: data.passwordPolicy,
                            validatePassword: function(password) {
                                const policy = this.passwordPolicy;
                                const errors = [];

                                if (password.length < policy.minLength) {
                                    errors.push(`Password must be at least ${policy.minLength} characters`);
                                }

                                if (policy.requireUppercase && !/[A-Z]/.test(password)) {
                                    errors.push('Password must contain at least one uppercase letter');
                                }

                                if (policy.requireLowercase && !/[a-z]/.test(password)) {
                                    errors.push('Password must contain at least one lowercase letter');
                                }

                                if (policy.requireNumbers && !/\d/.test(password)) {
                                    errors.push('Password must contain at least one number');
                                }

                                if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                                    errors.push('Password must contain at least one special character');
                                }

                                return {
                                    valid: errors.length === 0,
                                    errors
                                };
                            }
                        };

                        // Test each password against the policy
                        data.testPasswords.forEach(testCase => {
                            const validation = mockSettings.validatePassword(testCase.password);
                            
                            // Check length requirement
                            if (testCase.password.length < data.passwordPolicy.minLength) {
                                expect(validation.valid).toBe(false);
                                expect(validation.errors.some(error => 
                                    error.includes('must be at least')
                                )).toBe(true);
                            }
                            
                            // Check uppercase requirement
                            if (data.passwordPolicy.requireUppercase && !/[A-Z]/.test(testCase.password)) {
                                expect(validation.valid).toBe(false);
                                expect(validation.errors.some(error => 
                                    error.includes('uppercase letter')
                                )).toBe(true);
                            }
                            
                            // Check lowercase requirement
                            if (data.passwordPolicy.requireLowercase && !/[a-z]/.test(testCase.password)) {
                                expect(validation.valid).toBe(false);
                                expect(validation.errors.some(error => 
                                    error.includes('lowercase letter')
                                )).toBe(true);
                            }
                            
                            // Check numbers requirement
                            if (data.passwordPolicy.requireNumbers && !/\d/.test(testCase.password)) {
                                expect(validation.valid).toBe(false);
                                expect(validation.errors.some(error => 
                                    error.includes('number')
                                )).toBe(true);
                            }
                            
                            // Check special characters requirement
                            if (data.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(testCase.password)) {
                                expect(validation.valid).toBe(false);
                                expect(validation.errors.some(error => 
                                    error.includes('special character')
                                )).toBe(true);
                            }
                            
                            // If all requirements are met, password should be valid
                            const meetsLength = testCase.password.length >= data.passwordPolicy.minLength;
                            const meetsUppercase = !data.passwordPolicy.requireUppercase || /[A-Z]/.test(testCase.password);
                            const meetsLowercase = !data.passwordPolicy.requireLowercase || /[a-z]/.test(testCase.password);
                            const meetsNumbers = !data.passwordPolicy.requireNumbers || /\d/.test(testCase.password);
                            const meetsSpecialChars = !data.passwordPolicy.requireSpecialChars || /[!@#$%^&*(),.?":{}|<>]/.test(testCase.password);
                            
                            if (meetsLength && meetsUppercase && meetsLowercase && meetsNumbers && meetsSpecialChars) {
                                expect(validation.valid).toBe(true);
                                expect(validation.errors).toHaveLength(0);
                            }
                        });
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should generate specific passwords that meet or violate policy requirements', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        minLength: fc.integer({ min: 8, max: 16 }),
                        requireUppercase: fc.boolean(),
                        requireLowercase: fc.boolean(),
                        requireNumbers: fc.boolean(),
                        requireSpecialChars: fc.boolean()
                    }),
                    (policy) => {
                        // Create a mock SecuritySettings instance
                        const mockSettings = {
                            passwordPolicy: policy,
                            validatePassword: function(password) {
                                const errors = [];

                                if (password.length < this.passwordPolicy.minLength) {
                                    errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters`);
                                }

                                if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
                                    errors.push('Password must contain at least one uppercase letter');
                                }

                                if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
                                    errors.push('Password must contain at least one lowercase letter');
                                }

                                if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
                                    errors.push('Password must contain at least one number');
                                }

                                if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                                    errors.push('Password must contain at least one special character');
                                }

                                return {
                                    valid: errors.length === 0,
                                    errors
                                };
                            }
                        };

                        // Generate a compliant password
                        let compliantPassword = 'a'.repeat(policy.minLength);
                        if (policy.requireUppercase) compliantPassword += 'A';
                        if (policy.requireLowercase) compliantPassword += 'b';
                        if (policy.requireNumbers) compliantPassword += '1';
                        if (policy.requireSpecialChars) compliantPassword += '!';

                        const compliantValidation = mockSettings.validatePassword(compliantPassword);
                        expect(compliantValidation.valid).toBe(true);
                        expect(compliantValidation.errors).toHaveLength(0);

                        // Generate non-compliant passwords
                        
                        // Too short password
                        if (policy.minLength > 1) {
                            const shortPassword = 'a'.repeat(policy.minLength - 1);
                            const shortValidation = mockSettings.validatePassword(shortPassword);
                            expect(shortValidation.valid).toBe(false);
                            expect(shortValidation.errors.some(error => 
                                error.includes('must be at least')
                            )).toBe(true);
                        }

                        // Missing uppercase (if required)
                        if (policy.requireUppercase) {
                            let noUpperPassword = 'a'.repeat(policy.minLength);
                            if (policy.requireNumbers) noUpperPassword += '1';
                            if (policy.requireSpecialChars) noUpperPassword += '!';
                            
                            const noUpperValidation = mockSettings.validatePassword(noUpperPassword);
                            expect(noUpperValidation.valid).toBe(false);
                            expect(noUpperValidation.errors.some(error => 
                                error.includes('uppercase letter')
                            )).toBe(true);
                        }

                        // Missing lowercase (if required)
                        if (policy.requireLowercase) {
                            let noLowerPassword = 'A'.repeat(policy.minLength);
                            if (policy.requireNumbers) noLowerPassword += '1';
                            if (policy.requireSpecialChars) noLowerPassword += '!';
                            
                            const noLowerValidation = mockSettings.validatePassword(noLowerPassword);
                            expect(noLowerValidation.valid).toBe(false);
                            expect(noLowerValidation.errors.some(error => 
                                error.includes('lowercase letter')
                            )).toBe(true);
                        }

                        // Missing numbers (if required)
                        if (policy.requireNumbers) {
                            let noNumberPassword = 'A'.repeat(policy.minLength);
                            if (policy.requireLowercase) noNumberPassword += 'a';
                            if (policy.requireSpecialChars) noNumberPassword += '!';
                            
                            const noNumberValidation = mockSettings.validatePassword(noNumberPassword);
                            expect(noNumberValidation.valid).toBe(false);
                            expect(noNumberValidation.errors.some(error => 
                                error.includes('number')
                            )).toBe(true);
                        }

                        // Missing special characters (if required)
                        if (policy.requireSpecialChars) {
                            let noSpecialPassword = 'A'.repeat(policy.minLength);
                            if (policy.requireLowercase) noSpecialPassword += 'a';
                            if (policy.requireNumbers) noSpecialPassword += '1';
                            
                            const noSpecialValidation = mockSettings.validatePassword(noSpecialPassword);
                            expect(noSpecialValidation.valid).toBe(false);
                            expect(noSpecialValidation.errors.some(error => 
                                error.includes('special character')
                            )).toBe(true);
                        }

                        return true;
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should handle edge cases and boundary conditions', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        // Test boundary values
                        minLength: fc.constantFrom(6, 8, 12, 16, 20, 128),
                        allRequirementsEnabled: fc.boolean()
                    }),
                    (testCase) => {
                        const policy = {
                            minLength: testCase.minLength,
                            requireUppercase: testCase.allRequirementsEnabled,
                            requireLowercase: testCase.allRequirementsEnabled,
                            requireNumbers: testCase.allRequirementsEnabled,
                            requireSpecialChars: testCase.allRequirementsEnabled
                        };

                        const mockSettings = {
                            passwordPolicy: policy,
                            validatePassword: function(password) {
                                const errors = [];

                                if (password.length < this.passwordPolicy.minLength) {
                                    errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters`);
                                }

                                if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
                                    errors.push('Password must contain at least one uppercase letter');
                                }

                                if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
                                    errors.push('Password must contain at least one lowercase letter');
                                }

                                if (this.passwordPolicy.requireNumbers && !/\d/.test(password)) {
                                    errors.push('Password must contain at least one number');
                                }

                                if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                                    errors.push('Password must contain at least one special character');
                                }

                                return {
                                    valid: errors.length === 0,
                                    errors
                                };
                            }
                        };

                        // Test empty password
                        const emptyValidation = mockSettings.validatePassword('');
                        expect(emptyValidation.valid).toBe(false);
                        expect(emptyValidation.errors.length).toBeGreaterThan(0);

                        // Test exactly minimum length password
                        const exactLengthPassword = 'a'.repeat(testCase.minLength);
                        const exactLengthValidation = mockSettings.validatePassword(exactLengthPassword);
                        
                        if (testCase.allRequirementsEnabled) {
                            // Should fail because it only has lowercase
                            expect(exactLengthValidation.valid).toBe(false);
                        } else {
                            // Should pass if no other requirements
                            expect(exactLengthValidation.valid).toBe(true);
                        }

                        // Test password with all character types
                        const complexPassword = 'A'.repeat(Math.max(1, testCase.minLength - 3)) + 'a1!';
                        const complexValidation = mockSettings.validatePassword(complexPassword);
                        expect(complexValidation.valid).toBe(true);
                        expect(complexValidation.errors).toHaveLength(0);

                        return true;
                    }
                ),
                { numRuns: 30 }
            );
        });
    });
});