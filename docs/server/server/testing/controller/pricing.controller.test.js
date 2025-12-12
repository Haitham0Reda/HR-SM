/**
 * Pricing Controller Tests
 * 
 * Tests for pricing calculation and quote generation
 */

import { generateQuote, getModulePricing, calculatePricing } from '../../platform/subscriptions/controllers/pricing.controller.js';
import { MODULES } from '../../shared/constants/modules.js';

// Mock response object helper
function createMockResponse() {
    const res = {
        statusCode: 200,
        data: null
    };
    res.status = function(code) {
        res.statusCode = code;
        return res;
    };
    res.json = function(data) {
        res.data = data;
        return res;
    };
    return res;
}

describe('Pricing Controller', () => {
    describe('generateQuote', () => {
        test('should generate SaaS quote with valid modules', async () => {
            const req = {
                body: {
                    deploymentType: 'saas',
                    modules: [
                        { moduleKey: MODULES.ATTENDANCE, tier: 'starter', employeeCount: 50 },
                        { moduleKey: MODULES.LEAVE, tier: 'starter', employeeCount: 50 }
                    ],
                    companyName: 'Test Company',
                    contactEmail: 'test@example.com',
                    billingCycle: 'monthly'
                }
            };

            const res = createMockResponse();

            await generateQuote(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data).toBeDefined();
            
            const quote = res.data;
            expect(quote).toHaveProperty('quoteId');
            expect(quote).toHaveProperty('pricing');
            expect(quote.deploymentType).toBe('saas');
            expect(quote.pricing.moduleCount).toBe(2);
        });

        test('should generate On-Premise quote with valid modules', async () => {
            const req = {
                body: {
                    deploymentType: 'onpremise',
                    modules: [
                        { moduleKey: MODULES.ATTENDANCE, tier: 'business' },
                        { moduleKey: MODULES.LEAVE, tier: 'business' },
                        { moduleKey: MODULES.PAYROLL, tier: 'business' }
                    ],
                    companyName: 'Test Company',
                    contactEmail: 'test@example.com'
                }
            };

            const res = createMockResponse();

            await generateQuote(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data).toBeDefined();
            
            const quote = res.data;
            expect(quote).toHaveProperty('quoteId');
            expect(quote).toHaveProperty('pricing');
            expect(quote.deploymentType).toBe('onpremise');
            expect(quote.pricing.moduleCount).toBe(3);
            // Should have 10% discount for 3 modules
            expect(quote.pricing.discountRate).toBe(0.10);
        });

        test('should apply 15% discount for 5+ modules', async () => {
            const req = {
                body: {
                    deploymentType: 'saas',
                    modules: [
                        { moduleKey: MODULES.ATTENDANCE, tier: 'starter', employeeCount: 10 },
                        { moduleKey: MODULES.LEAVE, tier: 'starter', employeeCount: 10 },
                        { moduleKey: MODULES.PAYROLL, tier: 'starter', employeeCount: 10 },
                        { moduleKey: MODULES.DOCUMENTS, tier: 'starter', employeeCount: 10 },
                        { moduleKey: MODULES.COMMUNICATION, tier: 'starter', employeeCount: 10 }
                    ]
                }
            };

            const res = createMockResponse();

            await generateQuote(req, res);

            expect(res.statusCode).toBe(200);
            const quote = res.data;
            expect(quote.pricing.discountRate).toBe(0.15);
        });

        test('should reject invalid deployment type', async () => {
            const req = {
                body: {
                    deploymentType: 'invalid',
                    modules: [{ moduleKey: MODULES.ATTENDANCE, tier: 'starter' }]
                }
            };

            const res = createMockResponse();

            await generateQuote(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data).toMatchObject({
                error: 'INVALID_DEPLOYMENT_TYPE'
            });
        });

        test('should reject empty modules array', async () => {
            const req = {
                body: {
                    deploymentType: 'saas',
                    modules: []
                }
            };

            const res = createMockResponse();

            await generateQuote(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data).toMatchObject({
                error: 'INVALID_MODULES'
            });
        });

        test('should reject invalid tier', async () => {
            const req = {
                body: {
                    deploymentType: 'saas',
                    modules: [
                        { moduleKey: MODULES.ATTENDANCE, tier: 'invalid', employeeCount: 10 }
                    ]
                }
            };

            const res = createMockResponse();

            await generateQuote(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data).toMatchObject({
                error: 'INVALID_TIER'
            });
        });
    });

    describe('getModulePricing', () => {
        test('should return all module pricing information', async () => {
            const req = {};
            const res = createMockResponse();

            await getModulePricing(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data).toBeDefined();
            
            const response = res.data;
            expect(response).toHaveProperty('modules');
            expect(response).toHaveProperty('bundleDiscounts');
            expect(Array.isArray(response.modules)).toBe(true);
            expect(response.modules.length).toBeGreaterThan(0);
        });
    });

    describe('calculatePricing', () => {
        test('should calculate SaaS pricing from query params', async () => {
            const modules = [
                { moduleKey: MODULES.ATTENDANCE, tier: 'starter', employeeCount: 20 }
            ];

            const req = {
                query: {
                    deploymentType: 'saas',
                    modules: JSON.stringify(modules)
                }
            };

            const res = createMockResponse();

            await calculatePricing(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.data).toBeDefined();
            
            const pricing = res.data;
            expect(pricing).toHaveProperty('subtotal');
            expect(pricing).toHaveProperty('total');
            expect(pricing).toHaveProperty('breakdown');
        });

        test('should reject invalid JSON in modules param', async () => {
            const req = {
                query: {
                    deploymentType: 'saas',
                    modules: 'invalid-json'
                }
            };

            const res = createMockResponse();

            await calculatePricing(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.data).toMatchObject({
                error: 'INVALID_MODULES_FORMAT'
            });
        });
    });
});
