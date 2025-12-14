import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('👥 Checking TechCorp User Personal Info...');

// Simple schemas
const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }
});

const userSchema = new mongoose.Schema({
    tenantId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    employeeId: { type: String, required: true },
    personalInfo: {
        fullName: String,
        firstName: String,
        medName: String,
        lastName: String,
        arabicName: String,
        dateOfBirth: Date,
        gender: String,
        nationality: String,
        nationalId: String,
        phone: String,
        address: String,
        maritalStatus: String,
        profilePicture: String
    }
});

const Company = mongoose.model('Company', companySchema, 'platform_companies');
const User = mongoose.model('User', userSchema);

/**
 * Check TechCorp users' personal info
 */
async function checkTechCorpUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find TechCorp Solutions company
        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        if (!company) {
            throw new Error('TechCorp Solutions company not found');
        }

        const tenantId = company._id.toString();
        console.log(`🏢 TechCorp tenant ID: ${tenantId}`);

        // Find all TechCorp users
        const users = await User.find({ tenantId });
        console.log(`👥 Found ${users.length} TechCorp users`);

        console.log('\n📋 User Personal Info Status:');
        console.log('================================');

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.employeeId} (${user.email})`);
            console.log(`   Username: ${user.username}`);
            
            if (user.personalInfo) {
                console.log(`   Personal Info: Present`);
                console.log(`   - Full Name: ${user.personalInfo.fullName || 'Not set'}`);
                console.log(`   - First Name: ${user.personalInfo.firstName || 'Not set'}`);
                console.log(`   - Last Name: ${user.personalInfo.lastName || 'Not set'}`);
                console.log(`   - Gender: ${user.personalInfo.gender || 'Not set'}`);
                console.log(`   - Phone: ${user.personalInfo.phone || 'Not set'}`);
                
                if (!user.personalInfo.firstName || !user.personalInfo.lastName) {
                    console.log(`   ⚠️ Missing first/last name - this will cause display issues`);
                }
            } else {
                console.log(`   ❌ Personal Info: Missing completely`);
            }
        });

        // Check if we need to update personal info
        const usersWithoutNames = users.filter(user => 
            !user.personalInfo?.firstName || !user.personalInfo?.lastName
        );

        if (usersWithoutNames.length > 0) {
            console.log(`\n⚠️ ${usersWithoutNames.length} users need personal info updates`);
            console.log('\n💡 Suggested Fix:');
            console.log('Update users with proper first/last names for attendance dashboard display');
            
            return { needsUpdate: true, users: usersWithoutNames };
        } else {
            console.log('\n✅ All users have proper personal info');
            return { needsUpdate: false, users: [] };
        }

    } catch (error) {
        console.error('❌ Error checking users:', error);
        throw error;
    } finally {
        console.log('\n🔌 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

/**
 * Update TechCorp users with proper personal info
 */
async function updateTechCorpUsersPersonalInfo() {
    try {
        console.log('\n🔧 Updating TechCorp Users Personal Info...');
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        const company = await Company.findOne({ slug: 'techcorp_solutions' });
        const tenantId = company._id.toString();
        
        // Define proper names for TechCorp employees
        const userUpdates = [
            { employeeId: 'TC001', firstName: 'Admin', lastName: 'TechCorp', fullName: 'Admin TechCorp' },
            { employeeId: 'TC002', firstName: 'Sarah', lastName: 'Johnson', fullName: 'Sarah Johnson' },
            { employeeId: 'TC003', firstName: 'Mike', lastName: 'Wilson', fullName: 'Mike Wilson' },
            { employeeId: 'TC004', firstName: 'John', lastName: 'Doe', fullName: 'John Doe' },
            { employeeId: 'TC005', firstName: 'Jane', lastName: 'Smith', fullName: 'Jane Smith' },
            { employeeId: 'TC006', firstName: 'Ahmed', lastName: 'Ali', fullName: 'Ahmed Ali' },
            { employeeId: 'TC007', firstName: 'Fatma', lastName: 'Mohamed', fullName: 'Fatma Mohamed' },
            { employeeId: 'TC008', firstName: 'Omar', lastName: 'Ibrahim', fullName: 'Omar Ibrahim' }
        ];
        
        console.log('📝 Updating user personal info...');
        
        for (const update of userUpdates) {
            const result = await User.updateOne(
                { tenantId, employeeId: update.employeeId },
                {
                    $set: {
                        'personalInfo.firstName': update.firstName,
                        'personalInfo.lastName': update.lastName,
                        'personalInfo.fullName': update.fullName,
                        'personalInfo.gender': 'Not specified',
                        'personalInfo.nationality': 'Not specified'
                    }
                }
            );
            
            if (result.matchedCount > 0) {
                console.log(`✅ Updated ${update.employeeId}: ${update.fullName}`);
            } else {
                console.log(`⚠️ User ${update.employeeId} not found`);
            }
        }
        
        console.log('\n✅ Personal info updates completed');
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error updating users:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function runCheck() {
    try {
        const result = await checkTechCorpUsers();
        
        if (result.needsUpdate) {
            console.log('\n🔧 Applying fixes...');
            await updateTechCorpUsersPersonalInfo();
            
            console.log('\n🎉 Fix completed! Re-checking...');
            await checkTechCorpUsers();
        }
        
        console.log('\n💡 Next Steps:');
        console.log('1. Refresh the attendance dashboard');
        console.log('2. Names should now display properly');
        console.log('3. Check browser console for any remaining errors');
        
    } catch (error) {
        console.error('\n💥 Check failed:', error.message);
        process.exit(1);
    }
}

// Run the check
runCheck();