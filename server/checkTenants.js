#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tenant from './platform/tenants/models/Tenant.js';

dotenv.config();

async function checkTenants() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const tenants = await Tenant.find({});
        console.log(`📋 Found ${tenants.length} tenants in database`);

        if (tenants.length > 0) {
            console.log('\n🏢 Tenants:');
            tenants.forEach((tenant, index) => {
                console.log(`${index + 1}. ${tenant.name} (${tenant.tenantId})`);
                console.log(`   Status: ${tenant.status}`);
                console.log(`   License Key: ${tenant.license?.licenseKey ? 'Present' : 'Missing'}`);
                console.log(`   License Status: ${tenant.license?.licenseStatus || 'N/A'}`);
                console.log('');
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkTenants();