import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Import after env is loaded
const TenantConfig = (await import('../../modules/hr-core/models/TenantConfig.js')).default;
const { MODULES } = await import('../../shared/constants/modules.js');

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Your Company';

async function createInitialTenant() {
    try {
        console.log('🔧 Creating initial tenant configuration...');
        console.log(`📍 Tenant ID: ${DEFAULT_TENANT_ID}`);
        console.log(`🏢 Company Name: ${COMPANY_NAME}`);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database');

        // Check if tenant already exists
        let tenant = await TenantConfig.findOne({ tenantId: DEFAULT_TENANT_ID });

        if (tenant) {
            console.log('⚠ Tenant configuration already exists');
            console.log('📋 Current configuration:');
            console.log(`   - Company: ${tenant.companyName}`);
            console.log(`   - Mode: ${tenant.deploymentMode}`);
            console.log(`   - Modules enabled: ${tenant.modules.size}`);

            // List enabled modules
            tenant.modules.forEach((config, moduleName) => {
                if (config.enabled) {
                    console.log(`     ✓ ${moduleName}`);
                }
            });

        } else {
            // Create new tenant configuration
            tenant = await TenantConfig.create({
                tenantId: DEFAULT_TENANT_ID,
                companyName: COMPANY_NAME,
                deploymentMode: process.env.DEPLOYMENT_MODE || 'saas',
                modules: new Map([
                    [MODULES.HR_CORE, { enabled: true, enabledAt: new Date() }],
                    [MODULES.ATTENDANCE, { enabled: true, enabledAt: new Date() }],
                    [MODULES.LEAVE, { enabled: true, enabledAt: new Date() }],
                    [MODULES.PAYROLL, { enabled: true, enabledAt: new Date() }],
                    [MODULES.DOCUMENTS, { enabled: true, enabledAt: new Date() }],
                    [MODULES.COMMUNICATION, { enabled: true, enabledAt: new Date() }],
                    [MODULES.REPORTING, { enabled: true, enabledAt: new Date() }],
                    [MODULES.TASKS, { enabled: true, enabledAt: new Date() }]
                ]),
                subscription: {
                    plan: 'enterprise',
                    status: 'active',
                    maxEmployees: 1000,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
                },
                settings: {
                    timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
                    dateFormat: 'YYYY-MM-DD',
                    currency: process.env.DEFAULT_CURRENCY || 'USD',
                    language: process.env.DEFAULT_LANGUAGE || 'en'
                }
            });

            console.log('\n' + '='.repeat(50));
            console.log('✓ Initial tenant created successfully!');
            console.log('='.repeat(50));
            console.log('📋 Configuration:');
            console.log(`   - Tenant ID: ${tenant.tenantId}`);
            console.log(`   - Company: ${tenant.companyName}`);
            console.log(`   - Mode: ${tenant.deploymentMode}`);
            console.log(`   - Plan: ${tenant.subscription.plan}`);
            console.log(`   - Max Employees: ${tenant.subscription.maxEmployees}`);
            console.log(`   - Modules enabled: ${tenant.modules.size}`);
            console.log('\n📦 Enabled Modules:');
            tenant.modules.forEach((config, moduleName) => {
                if (config.enabled) {
                    console.log(`   ✓ ${moduleName}`);
                }
            });
            console.log('='.repeat(50) + '\n');
        }

        await mongoose.disconnect();
        console.log('✓ Disconnected from database');
        process.exit(0);

    } catch (error) {
        console.error('✗ Failed to create tenant:', error);
        process.exit(1);
    }
}

// Run setup
createInitialTenant();
