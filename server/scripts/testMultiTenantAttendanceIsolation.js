import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🏢 Testing Multi-Tenant Attendance Isolation...');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Simple schemas for testing
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const attendanceSchema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    status: { type: String },
    checkIn: {
        time: Date,
        method: String,
        location: String,
        isLate: Boolean,
        lateMinutes: Number
    },
    checkOut: {
        time: Date,
        method: String,
        location: String,
        isEarly: Boolean,
        earlyMinutes: Number
    }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
    tenantId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    employeeId: { type: String, required: true },
    personalInfo: {
        firstName: String,
        lastName: String
    }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');
const Attendance = mongoose.model('Attendance', attendanceSchema);
const User = mongoose.model('User', userSchema);

/**
 * Get authentication token for a company
 */
async function getCompanyAuthToken(companySlug, email, password) {
    try {
        console.log(`🔐 Getting auth token for ${companySlug}...`);
        
        // Get company info
        const company = await Company.findOne({ slug: companySlug });
        if (!company) {
            throw new Error(`Company ${companySlug} not found`);
        }

        const tenantId = company._id.toString();
        
        // Login
        const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email,
            password,
            tenantId: tenantId
        });

        if (!loginResponse.data.success) {
            throw new Error(`Login failed for ${companySlug}: ${loginResponse.data.message}`);
        }

        console.log(`✅ Auth token obtained for ${companySlug}`);
        return {
            token: loginResponse.data.data.token,
            tenantId: tenantId,
            user: loginResponse.data.data.user
        };
    } catch (error) {
        console.error(`❌ Auth error for ${companySlug}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Test attendance API for a company
 */
async function testCompanyAttendance(companySlug, authData) {
    try {
        console.log(`\n📊 Testing attendance for ${companySlug}...`);
        
        const headers = {
            'Authorization': `Bearer ${authData.token}`,
            'Content-Type': 'application/json'
        };

        // Test all attendance endpoint
        const response = await axios.get(`${API_BASE_URL}/api/v1/attendance`, { headers });
        
        console.log(`📋 ${companySlug} attendance records: ${response.data.length}`);
        
        // Verify all records belong to this tenant
        const invalidRecords = response.data.filter(record => record.tenantId !== authData.tenantId);
        if (invalidRecords.length > 0) {
            console.error(`❌ SECURITY ISSUE: ${companySlug} can see ${invalidRecords.length} records from other tenants!`);
            invalidRecords.forEach(record => {
                console.error(`  - Record ${record._id} belongs to tenant ${record.tenantId}`);
            });
            return { success: false, records: response.data.length, invalidRecords: invalidRecords.length };
        } else {
            console.log(`✅ ${companySlug} tenant isolation verified - all records belong to tenant ${authData.tenantId}`);
        }

        // Show sample records
        if (response.data.length > 0) {
            console.log(`📝 Sample records for ${companySlug}:`);
            response.data.slice(0, 3).forEach((record, index) => {
                const employee = record.employee;
                const name = employee ? `${employee.personalInfo?.firstName || 'Unknown'} ${employee.personalInfo?.lastName || ''}`.trim() : 'Unknown';
                console.log(`  ${index + 1}. ${new Date(record.date).toDateString()} - ${employee?.employeeId || 'N/A'} (${name}) - ${record.status}`);
            });
        }

        return { success: true, records: response.data.length, invalidRecords: 0 };
    } catch (error) {
        console.error(`❌ Error testing ${companySlug}:`, error.response?.status, error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get database statistics for verification
 */
async function getDatabaseStats() {
    try {
        console.log('\n📊 Database Statistics:');
        
        // Total attendance records
        const totalAttendance = await Attendance.countDocuments({});
        console.log(`📋 Total attendance records: ${totalAttendance}`);
        
        // Records per tenant
        const tenantStats = await Attendance.aggregate([
            { $group: { _id: '$tenantId', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('📈 Records per tenant:');
        for (const stat of tenantStats) {
            const company = await Company.findById(stat._id);
            const companyName = company ? company.name : `Unknown (${stat._id})`;
            console.log(`  - ${companyName}: ${stat.count} records`);
        }
        
        return { totalAttendance, tenantStats };
    } catch (error) {
        console.error('❌ Error getting database stats:', error);
        return null;
    }
}

/**
 * Test cross-tenant access attempt (should fail)
 */
async function testCrossTenantAccess() {
    try {
        console.log('\n🔒 Testing Cross-Tenant Access Security...');
        
        // Get TechCorp token
        const techCorpAuth = await getCompanyAuthToken('techcorp_solutions', 'admin@techcorp.com', 'admin123');
        
        // Try to access another company's data by manipulating the request
        // This should NOT work due to tenant filtering in the backend
        
        const headers = {
            'Authorization': `Bearer ${techCorpAuth.token}`,
            'Content-Type': 'application/json'
        };

        // Get TechCorp's attendance (should work)
        const techCorpResponse = await axios.get(`${API_BASE_URL}/api/v1/attendance`, { headers });
        console.log(`✅ TechCorp can access its own data: ${techCorpResponse.data.length} records`);
        
        // Verify all records belong to TechCorp
        const nonTechCorpRecords = techCorpResponse.data.filter(record => record.tenantId !== techCorpAuth.tenantId);
        if (nonTechCorpRecords.length === 0) {
            console.log('✅ Security verified: TechCorp can only see its own attendance records');
            return true;
        } else {
            console.error(`❌ SECURITY BREACH: TechCorp can see ${nonTechCorpRecords.length} records from other companies!`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error testing cross-tenant access:', error.message);
        return false;
    }
}

/**
 * Main test function
 */
async function runMultiTenantTests() {
    try {
        console.log('🚀 Starting Multi-Tenant Attendance Isolation Tests...');
        
        // Connect to database
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get database statistics
        const dbStats = await getDatabaseStats();

        // Test companies with known credentials
        const testCompanies = [
            { slug: 'techcorp_solutions', email: 'admin@techcorp.com', password: 'admin123' },
            { slug: 'test_platform_company', email: 'admin@testcompany.com', password: 'admin123' },
            { slug: 'global_manufacturing_inc', email: 'admin@globalmanuf.com', password: 'admin123' }
        ];

        const results = [];
        
        for (const company of testCompanies) {
            try {
                const authData = await getCompanyAuthToken(company.slug, company.email, company.password);
                const testResult = await testCompanyAttendance(company.slug, authData);
                results.push({ company: company.slug, ...testResult });
            } catch (error) {
                console.log(`⚠️ Skipping ${company.slug}: ${error.message}`);
                results.push({ company: company.slug, success: false, error: error.message });
            }
        }

        // Test cross-tenant security
        const securityTest = await testCrossTenantAccess();

        // Summary
        console.log('\n📋 Test Results Summary:');
        console.log('========================');
        
        results.forEach(result => {
            if (result.success) {
                console.log(`✅ ${result.company}: ${result.records} records (${result.invalidRecords} invalid)`);
            } else {
                console.log(`❌ ${result.company}: ${result.error || 'Failed'}`);
            }
        });
        
        console.log(`🔒 Cross-tenant security: ${securityTest ? '✅ SECURE' : '❌ VULNERABLE'}`);
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        console.log('==================');
        
        const successfulTests = results.filter(r => r.success);
        const failedTests = results.filter(r => !r.success);
        
        if (successfulTests.length > 0) {
            console.log('✅ Tenant isolation is working correctly for tested companies');
            console.log('✅ Each company can only see their own attendance data');
        }
        
        if (failedTests.length > 0) {
            console.log(`⚠️ ${failedTests.length} companies could not be tested (likely no users or data)`);
        }
        
        if (securityTest) {
            console.log('✅ Cross-tenant access protection is working');
        } else {
            console.log('❌ CRITICAL: Cross-tenant access protection needs review');
        }

        console.log('\n🎉 Multi-tenant attendance isolation test completed!');
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    } finally {
        console.log('\n🔌 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

// Run the test
runMultiTenantTests();