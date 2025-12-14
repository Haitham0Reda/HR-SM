/**
 * Enable Payroll Module License
 * Adds the payroll module to the tenant's license
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// License schema (simplified)
const moduleLicenseSchema = new mongoose.Schema({
    key: String,
    enabled: Boolean,
    tier: String,
    limits: {
        employees: Number,
        storage: Number,
        apiCalls: Number,
        customLimits: mongoose.Schema.Types.Mixed
    },
    activatedAt: Date,
    expiresAt: Date
}, { _id: false });

const licenseSchema = new mongoose.Schema({
    tenantId: String,
    subscriptionId: String,
    modules: [moduleLicenseSchema],
    billingCycle: String,
    status: String,
    trialEndsAt: Date,
    paymentMethod: String,
    billingEmail: String
}, { timestamps: true });

const License = mongoose.model('License', licenseSchema);

async function enablePayrollLicense() {
    console.log('🔧 Enabling Payroll Module License...\n');

    try {
        await connectDB();

        const tenantId = '693db0e2ccc5ea08aeee120c';
        
        // Find the license for this tenant
        console.log('1. Finding license for tenant:', tenantId);
        const license = await License.findOne({ tenantId });
        
        if (!license) {
            console.log('❌ No license found for tenant');
            return;
        }

        console.log('✅ License found');
        console.log('   Current modules:', license.modules.map(m => `${m.key} (${m.enabled ? 'enabled' : 'disabled'})`));

        // Check if payroll module already exists
        const existingPayrollModule = license.modules.find(m => m.key === 'payroll');
        
        if (existingPayrollModule) {
            if (existingPayrollModule.enabled) {
                console.log('✅ Payroll module is already enabled');
                return;
            } else {
                console.log('2. Enabling existing payroll module...');
                existingPayrollModule.enabled = true;
                existingPayrollModule.activatedAt = new Date();
                existingPayrollModule.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            }
        } else {
            console.log('2. Adding payroll module to license...');
            
            // Add payroll module
            const payrollModule = {
                key: 'payroll',
                enabled: true,
                tier: 'starter',
                limits: {
                    employees: null,
                    storage: null,
                    apiCalls: null,
                    customLimits: {}
                },
                activatedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
            };
            
            license.modules.push(payrollModule);
        }

        // Save the updated license
        await license.save();
        
        console.log('✅ Payroll module license enabled successfully');
        console.log('   Updated modules:', license.modules.map(m => `${m.key} (${m.enabled ? 'enabled' : 'disabled'})`));
        
        // Verify the change
        console.log('\n3. Verifying the change...');
        const updatedLicense = await License.findOne({ tenantId });
        const payrollModule = updatedLicense.modules.find(m => m.key === 'payroll');
        
        if (payrollModule && payrollModule.enabled) {
            console.log('✅ Verification successful - Payroll module is now enabled');
            console.log('   Expires at:', payrollModule.expiresAt);
        } else {
            console.log('❌ Verification failed - Payroll module not found or not enabled');
        }

    } catch (error) {
        console.error('❌ Error enabling payroll license:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

enablePayrollLicense().catch(console.error);