#!/usr/bin/env node

/**
 * Fix License Tokens Script
 * 
 * This script adds proper license tokens to existing tenants
 * to resolve the 403 LICENSE_REQUIRED errors
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Tenant from './platform/tenants/models/Tenant.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔧 Starting license token fix script...');
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('License secret exists:', !!process.env.LICENSE_SECRET_KEY);

const LICENSE_SECRET_KEY = process.env.LICENSE_SECRET_KEY || 'LicenseSigningKey2024!@#$%^&*SecureKey';

// Generate a valid license token for a tenant
function generateLicenseToken(tenantId, licenseType = 'enterprise') {
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now

    const payload = {
        tenantId,
        licenseType,
        features: [
            'hr-core',
            'attendance', 
            'leave',
            'documents',
            'communication',
            'payroll',
            'reporting',
            'dashboard',
            'theme',
            'holidays',
            'requests',
            'announcements',
            'tasks',
            'logging'
        ],
        limits: {
            maxUsers: licenseType === 'enterprise' ? 1000 : 100,
            maxStorage: licenseType === 'enterprise' ? 100 * 1024 * 1024 * 1024 : 10 * 1024 * 1024 * 1024, // 100GB or 10GB
            maxAPICallsPerMonth: licenseType === 'enterprise' ? 1000000 : 100000
        },
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        issuer: 'HR-SM License Server',
        valid: true
    };

    return jwt.sign(payload, LICENSE_SECRET_KEY, {
        algorithm: 'HS256',
        expiresIn: '1y'
    });
}

async function fixLicenseTokens() {
    try {
        console.log('🔧 Fixing license tokens for existing tenants...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all tenants without license tokens
        const tenants = await Tenant.find({
            $or: [
                { 'license.licenseKey': { $exists: false } },
                { 'license.licenseKey': null },
                { 'license.licenseKey': '' }
            ]
        });

        console.log(`📋 Found ${tenants.length} tenants without license tokens\n`);

        if (tenants.length === 0) {
            console.log('✅ All tenants already have license tokens');
            return;
        }

        // Update each tenant with a license token
        for (const tenant of tenants) {
            console.log(`🏢 Processing tenant: ${tenant.name} (${tenant.tenantId})`);

            // Generate license token
            const licenseToken = generateLicenseToken(tenant.tenantId, 'enterprise');
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            // Update tenant with license information
            const result = await Tenant.findByIdAndUpdate(tenant._id, {
                $set: {
                    'license.licenseKey': licenseToken,
                    'license.licenseType': 'enterprise',
                    'license.licenseStatus': 'active',
                    'license.expiresAt': expiresAt,
                    'license.licenseExpiresAt': expiresAt,
                    'license.activatedAt': new Date(),
                    'license.lastValidatedAt': new Date(),
                    'license.features': [
                        'hr-core',
                        'attendance', 
                        'leave',
                        'documents',
                        'communication',
                        'payroll',
                        'reporting',
                        'dashboard',
                        'theme',
                        'holidays',
                        'requests',
                        'announcements',
                        'tasks',
                        'logging'
                    ],
                    'license.limits': {
                        maxUsers: 1000,
                        maxStorage: 100 * 1024 * 1024 * 1024, // 100GB
                        maxAPICallsPerMonth: 1000000
                    }
                }
            }, { new: true });

            if (result) {
                console.log(`   ✅ Added enterprise license token (expires: ${expiresAt.toDateString()})`);
            } else {
                console.log(`   ❌ Failed to update tenant ${tenant.tenantId}`);
            }
        }

        console.log(`\n🎉 Successfully updated ${tenants.length} tenants with license tokens`);

        // Verify the updates
        const updatedTenants = await Tenant.find({
            'license.licenseKey': { $exists: true, $ne: null, $ne: '' }
        });

        console.log(`\n📊 Verification: ${updatedTenants.length} tenants now have license tokens`);

        // Show sample tenant license info
        if (updatedTenants.length > 0) {
            const sampleTenant = updatedTenants.find(t => t.tenantId === 'techcorp_solutions') || updatedTenants[0];
            console.log(`\n📋 Sample license info for ${sampleTenant.name}:`);
            console.log(`   Tenant ID: ${sampleTenant.tenantId}`);
            console.log(`   License Type: ${sampleTenant.license.licenseType}`);
            console.log(`   Status: ${sampleTenant.license.licenseStatus}`);
            console.log(`   Expires: ${sampleTenant.license.expiresAt?.toDateString()}`);
            console.log(`   Features: ${sampleTenant.license.features?.length || 0} modules`);
            console.log(`   Max Users: ${sampleTenant.license.limits?.maxUsers || 'N/A'}`);
        }

    } catch (error) {
        console.error('❌ Error fixing license tokens:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
console.log('🚀 Running license token fix...');
fixLicenseTokens()
    .then(() => {
        console.log('\n✅ License token fix completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ License token fix failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    });

export default fixLicenseTokens;