#!/usr/bin/env node

/**
 * Regenerate One License Script
 * 
 * This script regenerates a license for one tenant to test the fix
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import axios from 'axios';
import Tenant from './platform/tenants/models/Tenant.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔧 Regenerating license for one tenant...');

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
const LICENSE_SERVER_API_KEY = 'hrsm_dev_admin_key_1234567890123456789012345678901234567890123';

async function regenerateOneLicense() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the techcorp_solutions tenant
        const tenant = await Tenant.findOne({ tenantId: 'techcorp_solutions' });
        
        if (!tenant) {
            console.log('❌ Tenant not found');
            return;
        }

        console.log(`🏢 Regenerating license for: ${tenant.name} (${tenant.tenantId})`);

        // Create new license via license server API
        const response = await axios.post(`${LICENSE_SERVER_URL}/licenses/create`, {
            tenantId: tenant.tenantId,
            tenantName: tenant.name,
            type: 'enterprise',
            modules: ['hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'],
            maxUsers: 1000,
            maxStorage: 10240, // 10GB in MB
            maxAPICallsPerMonth: 1000000,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            maxActivations: 3,
            notes: 'Regenerated to fix signature issue'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': LICENSE_SERVER_API_KEY
            }
        });

        if (response.data.success) {
            const licenseData = response.data.data;
            
            // Update tenant with new license information
            const result = await Tenant.findByIdAndUpdate(tenant._id, {
                $set: {
                    'license.licenseKey': licenseData.token,
                    'license.licenseNumber': licenseData.licenseNumber,
                    'license.licenseType': licenseData.type,
                    'license.licenseStatus': licenseData.status,
                    'license.expiresAt': new Date(licenseData.expiresAt),
                    'license.licenseExpiresAt': new Date(licenseData.expiresAt),
                    'license.activatedAt': new Date(),
                    'license.lastValidatedAt': new Date(),
                    'license.features': ['hr-core', 'tasks', 'clinic', 'payroll', 'reports', 'life-insurance'],
                    'license.limits': {
                        maxUsers: 1000,
                        maxStorage: 10 * 1024 * 1024 * 1024, // 10GB in bytes
                        maxAPICallsPerMonth: 1000000
                    }
                }
            }, { new: true });

            if (result) {
                console.log(`✅ License regenerated successfully`);
                console.log(`   License Number: ${licenseData.licenseNumber}`);
                console.log(`   Expires: ${new Date(licenseData.expiresAt).toDateString()}`);
                console.log(`   Token (first 50 chars): ${licenseData.token.substring(0, 50)}...`);
                
                // Test the new license immediately
                console.log('\n🧪 Testing new license...');
                
                const testResponse = await axios.post(`${LICENSE_SERVER_URL}/licenses/validate`, {
                    token: licenseData.token,
                    machineId: '9c6f506709bbc0fc0cf6ec5e943c0c2a'
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': 'hrsm_dev_backend_key_1234567890123456789012345678901234567890123'
                    }
                });

                if (testResponse.data.success && testResponse.data.valid) {
                    console.log('🎉 License validation successful!');
                    console.log('✅ The "invalid algorithm" error has been resolved!');
                } else {
                    console.log('❌ License validation still failing:');
                    console.log(`   Error: ${testResponse.data.error}`);
                }
            } else {
                console.log(`❌ Failed to update tenant`);
            }
        } else {
            console.log(`❌ License server returned error: ${response.data.error}`);
        }

    } catch (error) {
        if (error.response) {
            console.log('❌ Error:', error.response.data);
        } else {
            console.log('❌ Error:', error.message);
        }
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
regenerateOneLicense()
    .then(() => {
        console.log('\n✅ License regeneration completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ License regeneration failed:', error.message);
        process.exit(1);
    });