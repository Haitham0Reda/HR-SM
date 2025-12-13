import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import License from '../platform/system/models/license.model.js';

const createTechCorpLicense = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const tenantId = '693cd49496e80950a403b2c8';
        
        // Check if license already exists
        const existingLicense = await License.findOne({ tenantId });
        
        if (existingLicense) {
            console.log('✅ License already exists for TechCorp Solutions');
            console.log('License ID:', existingLicense._id);
            console.log('Status:', existingLicense.status);
            console.log('Tier:', existingLicense.tier);
            return;
        }

        // Create license for TechCorp Solutions
        const expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        
        const license = await License.create({
            tenantId: tenantId,
            subscriptionId: `techcorp-solutions-${Date.now()}`,
            status: 'active',
            billingCycle: 'annual',
            modules: [
                {
                    key: 'hr-core',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                },
                {
                    key: 'attendance',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                },
                {
                    key: 'leave',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                },
                {
                    key: 'payroll',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                },
                {
                    key: 'documents',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                },
                {
                    key: 'communication',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                },
                {
                    key: 'reporting',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                },
                {
                    key: 'tasks',
                    enabled: true,
                    tier: 'business',
                    limits: { employees: 100 },
                    activatedAt: new Date(),
                    expiresAt: expirationDate
                }
            ],
            billingEmail: 'admin@techcorp.com'
        });

        console.log('✅ License created successfully for TechCorp Solutions');
        console.log('License ID:', license._id);
        console.log('Tenant ID:', license.tenantId);
        console.log('Status:', license.status);
        console.log('Tier:', license.tier);
        console.log('Max Employees:', license.maxEmployees);
        console.log('Expires:', license.expiresAt);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

createTechCorpLicense();