/**
 * Pricing Service Tests
 * 
 * Tests for client-side pricing calculations
 */

import {
    calculateMonthlyCost,
    calculateOnPremiseCost,
    getBundleDiscountInfo,
    formatCurrency,
    PRICING_TIERS
} from './pricing.service';

// Mock module configs
const mockModuleConfigs = {
    'attendance': {
        key: 'attendance',
        displayName: 'Attendance & Time Tracking',
        commercial: {
            pricing: {
                starter: {
                    monthly: 5,
                    onPremise: 500,
                    limits: { employees: 50 }
                },
                business: {
                    monthly: 8,
                    onPremise: 1500,
                    limits: { employees: 200 }
                },
                enterprise: {
                    monthly: 'custom',
                    onPremise: 'custom',
                    limits: { employees: 'unlimited' }
                }
            }
        }
    },
    'leave': {
        key: 'leave',
        displayName: 'Leave Management',
        commercial: {
            pricing: {
                starter: {
                    monthly: 3,
                    onPremise: 300,
                    limits: { employees: 50 }
                },
                business: {
                    monthly: 5,
                    onPremise: 800,
                    limits: { employees: 200 }
                },
                enterprise: {
                    monthly: 'custom',
                    onPremise: 'custom',
                    limits: { employees: 'unlimited' }
                }
            }
        }
    },
    'payroll': {
        key: 'payroll',
        displayName: 'Payroll Management',
        commercial: {
            pricing: {
                starter: {
                    monthly: 10,
                    onPremise: 2000,
                    limits: { employees: 50 }
                },
                business: {
                    monthly: 15,
                    onPremise: 5000,
                    limits: { employees: 200 }
                },
                enterprise: {
                    monthly: 'custom',
                    onPremise: 'custom',
                    limits: { employees: 'unlimited' }
                }
            }
        }
    }
};

describe('Pricing Service', () => {
    describe('calculateMonthlyCost', () => {
        test('should calculate cost for single module', () => {
            const selections = [
                { moduleKey: 'attendance', tier: 'starter', employeeCount: 10 }
            ];

            const result = calculateMonthlyCost(selections, mockModuleConfigs);

            expect(result.subtotal).toBe(50); // 5 * 10
            expect(result.discount).toBe(0); // No discount for 1 module
            expect(result.total).toBe(50);
            expect(result.breakdown.length).toBe(1);
        });

        test('should calculate cost for multiple modules', () => {
            const selections = [
                { moduleKey: 'attendance', tier: 'starter', employeeCount: 20 },
                { moduleKey: 'leave', tier: 'starter', employeeCount: 20 }
            ];

            const result = calculateMonthlyCost(selections, mockModuleConfigs);

            expect(result.subtotal).toBe(160); // (5 * 20) + (3 * 20)
            expect(result.discount).toBe(0); // No discount for 2 modules
            expect(result.total).toBe(160);
            expect(result.breakdown.length).toBe(2);
        });

        test('should apply 10% discount for 3 modules', () => {
            const selections = [
                { moduleKey: 'attendance', tier: 'starter', employeeCount: 10 },
                { moduleKey: 'leave', tier: 'starter', employeeCount: 10 },
                { moduleKey: 'payroll', tier: 'starter', employeeCount: 10 }
            ];

            const result = calculateMonthlyCost(selections, mockModuleConfigs);

            expect(result.subtotal).toBe(180); // (5 + 3 + 10) * 10
            expect(result.discountRate).toBe(0.10);
            expect(result.discount).toBe(18); // 10% of 180
            expect(result.total).toBe(162); // 180 - 18
        });

        test('should handle custom pricing', () => {
            const selections = [
                { moduleKey: 'attendance', tier: 'enterprise', employeeCount: 100 }
            ];

            const result = calculateMonthlyCost(selections, mockModuleConfigs);

            expect(result.breakdown[0].isCustom).toBe(true);
            expect(result.breakdown[0].cost).toBe('custom');
        });

        test('should return zero for empty selections', () => {
            const result = calculateMonthlyCost([], mockModuleConfigs);

            expect(result.subtotal).toBe(0);
            expect(result.total).toBe(0);
            expect(result.breakdown.length).toBe(0);
        });
    });

    describe('calculateOnPremiseCost', () => {
        test('should calculate one-time cost for single module', () => {
            const selections = [
                { moduleKey: 'attendance', tier: 'starter' }
            ];

            const result = calculateOnPremiseCost(selections, mockModuleConfigs);

            expect(result.subtotal).toBe(500);
            expect(result.discount).toBe(0);
            expect(result.total).toBe(500);
        });

        test('should apply 10% discount for 3 modules', () => {
            const selections = [
                { moduleKey: 'attendance', tier: 'business' },
                { moduleKey: 'leave', tier: 'business' },
                { moduleKey: 'payroll', tier: 'business' }
            ];

            const result = calculateOnPremiseCost(selections, mockModuleConfigs);

            expect(result.subtotal).toBe(7300); // 1500 + 800 + 5000
            expect(result.discountRate).toBe(0.10);
            expect(result.discount).toBe(730);
            expect(result.total).toBe(6570);
        });

        test('should handle custom pricing', () => {
            const selections = [
                { moduleKey: 'payroll', tier: 'enterprise' }
            ];

            const result = calculateOnPremiseCost(selections, mockModuleConfigs);

            expect(result.breakdown[0].isCustom).toBe(true);
            expect(result.breakdown[0].cost).toBe('custom');
        });
    });

    describe('getBundleDiscountInfo', () => {
        test('should return no discount for less than 3 modules', () => {
            const info = getBundleDiscountInfo(2);

            expect(info.applicable).toBe(false);
            expect(info.rate).toBe(0);
            expect(info.percentage).toBe(0);
        });

        test('should return 10% discount for 3-4 modules', () => {
            const info = getBundleDiscountInfo(3);

            expect(info.applicable).toBe(true);
            expect(info.rate).toBe(0.10);
            expect(info.percentage).toBe(10);
        });

        test('should return 15% discount for 5+ modules', () => {
            const info = getBundleDiscountInfo(5);

            expect(info.applicable).toBe(true);
            expect(info.rate).toBe(0.15);
            expect(info.percentage).toBe(15);
        });
    });

    describe('formatCurrency', () => {
        test('should format number as currency', () => {
            const formatted = formatCurrency(1234.56);
            expect(formatted).toBe('$1,235');
        });

        test('should handle custom pricing', () => {
            const formatted = formatCurrency('custom');
            expect(formatted).toBe('Custom Pricing');
        });

        test('should handle zero', () => {
            const formatted = formatCurrency(0);
            expect(formatted).toBe('$0');
        });
    });
});
