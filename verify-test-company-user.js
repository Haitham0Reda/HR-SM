import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// User schema
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    tenantId: mongoose.Schema.Types.ObjectId,
    role: String,
    personalInfo: {
        firstName: String,
        lastName: String,
        fullName: String
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function verifyUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const email = 'admin@testcompany.com';
        const testPassword = 'admin123';
        
        console.log(`\nLooking for user: ${email}`);
        
        const user = await User.findOne({ email }).populate('tenant');
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('✅ User found:');
        console.log(`   ID: ${user._id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Tenant: ${user.tenant?.name || 'N/A'}`);
        console.log(`   Tenant ID: ${user.tenantId || user.tenant?._id || 'N/A'}`);
        
        // Test password
        console.log(`\nTesting password: ${testPassword}`);
        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`Password match: ${isMatch ? '✅' : '❌'}`);
        
        if (!isMatch) {
            console.log('\nTrying to reset password...');
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            await User.findByIdAndUpdate(user._id, { password: hashedPassword });
            console.log('✅ Password reset to admin123');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

verifyUser();