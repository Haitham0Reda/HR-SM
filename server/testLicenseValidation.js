#!/usr/bin/env node

/**
 * Test License Validation Script
 * 
 * This script tests the license validation to ensure the "invalid algorithm" error is resolved
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import Tenant from './models/Tenant.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🧪 Testing license validation...');

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
const LICENSE_SERVER_API_KEY = process.env.LICENSE_SERVER_API_KEY;

async function testLicenseValidation() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get a tenant with a license token
        const tenant = await Tenant.findOne({ 
            tenantId: 'techcorp_solutions',
            'license.licenseKey': { $exists: true, $ne: null, $ne: '' }
        });

        if (!tenant || !tenant.license || !tenant.license.licenseKey) {
            console.log('❌ No tenant with license token found');
            return;
        }

        console.log(`🏢 Testing with tenant: ${tenant.name} (${tenant.tenantId})`);
        console.log(`📄 License Number: ${tenant.license.licenseNumber}`);
        console.log(`🔑 Token (first 50 chars): ${tenant.license.licenseKey.substring(0, 50)}...`);

        // Test license validation
        console.log('\n🔍 Testing license validation...');
        
        const response = await axios.post(`${LICENSE_SERVER_URL}/licenses/validate`, {
            token: tenant.license.licenseKey,
            machineId: '9c6f506709bbc0fc0cf6ec5e943c0c2a'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': LICENSE_SERVER_API_KEY
            }
        });

        if (response.data.success && response.data.valid) {
            console.log('✅ License validation successful!');
            console.log(`   License Type: ${response.data.data.type}`);
            console.log(`   Features: ${response.data.data.features.join(', ')}`);
            console.log(`   Max Users: ${response.data.data.maxUsers}`);
            console.log(`   Expires: ${new Date(response.data.data.expiresAt).toDateString()}`);
            console.log(`   Status: ${response.data.data.status}`);
        } else {
            console.log('❌ License validation failed:');
            console.log(`   Error: ${response.data.error}`);
        }

    } catch (error) {
        if (error.response) {
            console.log('❌ License validation failed:');
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Error: ${error.response.data.error || error.response.data.message}`);
        } else {
            console.log('❌ Test failed:', error.message);
        }
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the test
testLicenseValidation()
    .then(() => {
        console.log('\n✅ License validation test completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ License validation test failed:', error.message);
        process.exit(1);
    });