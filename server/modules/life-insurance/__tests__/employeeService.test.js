/**
 * Employee Service Tests
 * 
 * Tests for the standardized employee lookup service functionality
 */

import employeeService from '../services/employeeService.js';
import { ROLES } from '../../../shared/constants/modules.js';

describe('Employee Service', () => {
    describe('validateEmployeeIdentifier', () => {
        test('should validate MongoDB ObjectId format', () => {
            const result = employeeService.validateEmployeeIdentifier('507f1f77bcf86cd799439011');
            expect(result.isValid).toBe(true);
            expect(result.type).toBe('objectId');
        });

        test('should validate employeeId string format', () => {
            const result = employeeService.validateEmployeeIdentifier('TC-0001');
            expect(result.isValid).toBe(true);
            expect(result.type).toBe('employeeId');
        });

        test('should reject empty identifier', () => {
            const result = employeeService.validateEmployeeIdentifier('');
            expect(result.isValid).toBe(false);
            expect(result.type).toBe(null);
        });

        test('should reject null identifier', () => {
            const result = employeeService.validateEmployeeIdentifier(null);
            expect(result.isValid).toBe(false);
            expect(result.type).toBe(null);
        });
    });

    describe('formatEmployeeData', () => {
        test('should format employee data consistently', () => {
            const mockEmployee = {
                _id: '507f1f77bcf86cd799439011',
                employeeId: 'TC-0001',
                personalInfo: {
                    firstName: 'John',
                    lastName: 'Doe',
                    fullName: 'John Doe'
                },
                email: 'john.doe@example.com',
                department: {
                    _id: '507f1f77bcf86cd799439012',
                    name: 'Engineering',
                    code: 'ENG'
                },
                position: {
                    _id: '507f1f77bcf86cd799439013',
                    title: 'Software Engineer',
                    level: 'Senior'
                },
                status: 'active',
                employment: {
                    employmentStatus: 'active'
                }
            };

            const formatted = employeeService.formatEmployeeData(mockEmployee);

            expect(formatted).toEqual({
                _id: '507f1f77bcf86cd799439011',
                employeeId: 'TC-0001',
                name: 'John Doe',
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                email: 'john.doe@example.com',
                department: {
                    _id: '507f1f77bcf86cd799439012',
                    name: 'Engineering',
                    code: 'ENG'
                },
                position: {
                    _id: '507f1f77bcf86cd799439013',
                    title: 'Software Engineer',
                    level: 'Senior'
                },
                status: 'active',
                employmentStatus: 'active'
            });
        });

        test('should handle employee with missing personalInfo', () => {
            const mockEmployee = {
                _id: '507f1f77bcf86cd799439011',
                employeeId: 'TC-0001',
                email: 'john.doe@example.com',
                status: 'active'
            };

            const formatted = employeeService.formatEmployeeData(mockEmployee);

            expect(formatted.name).toBe('john.doe@example.com');
            expect(formatted.firstName).toBeUndefined();
            expect(formatted.lastName).toBeUndefined();
        });

        test('should return null for null employee', () => {
            const formatted = employeeService.formatEmployeeData(null);
            expect(formatted).toBe(null);
        });
    });
});