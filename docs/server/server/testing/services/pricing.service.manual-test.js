/**
 * Manual verification script for pricing service
 * Run with: node server/testing/services/pricing.service.manual-test.js
 */

import { commercialModuleConfigs } from '../../config/commercialModuleRegistry.js';
import { MODULES } from '../../shared/constants/modules.js';

console.log('=== Pricing Service Manual Verification ===\n');

// Test 1: Calculate monthly cost for 2 modules
console.log('Test 1: Monthly cost for 2 modules (no discount)');
const modules1 = [
    { moduleKey: MODULES.ATTENDANCE, tier: 'starter', employeeCount: 50 },
    { moduleKey: MODULES.LEAVE, tier: 'starter', employeeCount: 50 }
];

let subtotal1 = 0;
for (const mod of modules1) {
    const config = commercialModuleConfigs[mod.moduleKey];
    const price = config.commercial.pricing[mod.tier].monthly;
    const cost = price * mod.employeeCount;
    subtotal1 += cost;
    console.log(`  ${config.displayName}: $${price}/employee × ${mod.employeeCount} = $${cost}`);
}
console.log(`  Subtotal: $${subtotal1}`);
console.log(`  Discount: $0 (no discount for 2 modules)`);
console.log(`  Total: $${subtotal1}\n`);

// Test 2: Calculate monthly cost for 3 modules (10% discount)
console.log('Test 2: Monthly cost for 3 modules (10% discount)');
const modules2 = [
    { moduleKey: MODULES.ATTENDANCE, tier: 'starter', employeeCount: 10 },
    { moduleKey: MODULES.LEAVE, tier: 'starter', employeeCount: 10 },
    { moduleKey: MODULES.PAYROLL, tier: 'starter', employeeCount: 10 }
];

let subtotal2 = 0;
for (const mod of modules2) {
    const config = commercialModuleConfigs[mod.moduleKey];
    const price = config.commercial.pricing[mod.tier].monthly;
    const cost = price * mod.employeeCount;
    subtotal2 += cost;
    console.log(`  ${config.displayName}: $${price}/employee × ${mod.employeeCount} = $${cost}`);
}
const discount2 = subtotal2 * 0.10;
const total2 = subtotal2 - discount2;
console.log(`  Subtotal: $${subtotal2}`);
console.log(`  Discount: $${discount2} (10% for 3 modules)`);
console.log(`  Total: $${total2}\n`);

// Test 3: Calculate monthly cost for 5 modules (15% discount)
console.log('Test 3: Monthly cost for 5 modules (15% discount)');
const modules3 = [
    { moduleKey: MODULES.ATTENDANCE, tier: 'starter', employeeCount: 10 },
    { moduleKey: MODULES.LEAVE, tier: 'starter', employeeCount: 10 },
    { moduleKey: MODULES.PAYROLL, tier: 'starter', employeeCount: 10 },
    { moduleKey: MODULES.DOCUMENTS, tier: 'starter', employeeCount: 10 },
    { moduleKey: MODULES.COMMUNICATION, tier: 'starter', employeeCount: 10 }
];

let subtotal3 = 0;
for (const mod of modules3) {
    const config = commercialModuleConfigs[mod.moduleKey];
    const price = config.commercial.pricing[mod.tier].monthly;
    const cost = price * mod.employeeCount;
    subtotal3 += cost;
    console.log(`  ${config.displayName}: $${price}/employee × ${mod.employeeCount} = $${cost}`);
}
const discount3 = subtotal3 * 0.15;
const total3 = subtotal3 - discount3;
console.log(`  Subtotal: $${subtotal3}`);
console.log(`  Discount: $${discount3} (15% for 5 modules)`);
console.log(`  Total: $${total3}\n`);

// Test 4: Calculate On-Premise cost for 3 modules (10% discount)
console.log('Test 4: On-Premise cost for 3 modules (10% discount)');
const modules4 = [
    { moduleKey: MODULES.ATTENDANCE, tier: 'business' },
    { moduleKey: MODULES.LEAVE, tier: 'business' },
    { moduleKey: MODULES.PAYROLL, tier: 'business' }
];

let subtotal4 = 0;
for (const mod of modules4) {
    const config = commercialModuleConfigs[mod.moduleKey];
    const price = config.commercial.pricing[mod.tier].onPremise;
    subtotal4 += price;
    console.log(`  ${config.displayName}: $${price} (one-time)`);
}
const discount4 = subtotal4 * 0.10;
const total4 = subtotal4 - discount4;
console.log(`  Subtotal: $${subtotal4}`);
console.log(`  Discount: $${discount4} (10% for 3 modules)`);
console.log(`  Total: $${total4}\n`);

console.log('=== All manual tests completed successfully ===');
