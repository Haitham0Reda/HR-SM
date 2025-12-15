import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function generateCorrectFrontendToken() {
    try {
        console.log('🔧 Generating Correct Frontend Token...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Import User model
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');

        // Find the admin user for techcorp_solutions
        const user = await User.findOne({ email: 'admin@techcorp.com' });
        if (!user) {
            console.log('❌ User admin@techcorp.com not found');
            return;
        }

        console.log('👤 User Details:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Tenant ID: ${user.tenantId}`);
        console.log(`   User ID: ${user._id}\n`);

        // Generate the correct token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                role: user.role,
                tenantId: user.tenantId 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('🔑 Generated Token:');
        console.log(token);
        console.log('');

        // Decode to verify
        const decoded = jwt.decode(token);
        console.log('🔓 Token Payload:');
        console.log(JSON.stringify(decoded, null, 2));
        console.log('');

        console.log('📋 Instructions:');
        console.log('1. Open browser developer tools (F12)');
        console.log('2. Go to Application/Storage tab');
        console.log('3. Find localStorage');
        console.log('4. Set or update the "token" key with the value above');
        console.log('5. Refresh the announcements page');
        console.log('');
        console.log('Or run this in browser console:');
        console.log(`localStorage.setItem('token', '${token}');`);
        console.log('window.location.reload();');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

generateCorrectFrontendToken();