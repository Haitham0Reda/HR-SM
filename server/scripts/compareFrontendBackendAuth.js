import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function compareFrontendBackendAuth() {
    try {
        console.log('🔍 Comparing Frontend vs Backend Authentication...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Import models
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
        const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');

        // Find the admin user (same as backend test)
        const user = await User.findOne({ email: 'admin@techcorp.com' });
        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('👤 Backend Test User:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Tenant ID: ${user.tenantId}`);
        console.log(`   User ID: ${user._id}\n`);

        // Generate token (same as backend test)
        const backendToken = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                role: user.role,
                tenantId: user.tenantId 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('🔑 Backend Test Token (first 50 chars):', backendToken.substring(0, 50) + '...\n');

        // Decode the backend token
        const decodedBackend = jwt.decode(backendToken);
        console.log('🔓 Backend Token Payload:');
        console.log(JSON.stringify(decodedBackend, null, 2));
        console.log('');

        // Check what announcements the backend query would return
        console.log('📢 Backend Query Simulation:');
        
        // Get all users in the same tenant
        const tenantUsers = await User.find({ tenantId: user.tenantId }).select('_id email');
        const tenantUserIds = tenantUsers.map(u => u._id);
        
        console.log(`🏢 Users in tenant ${user.tenantId}:`);
        tenantUsers.forEach(u => console.log(`   - ${u.email} (${u._id})`));
        console.log('');

        // Query announcements by tenant users (same as controller logic)
        const query = { createdBy: { $in: tenantUserIds } };
        const announcements = await Announcement.find(query)
            .populate('createdBy', 'username email')
            .sort({ publishDate: -1 });

        console.log(`📊 Announcements found by backend query: ${announcements.length}`);
        announcements.forEach((ann, index) => {
            console.log(`   ${index + 1}. "${ann.title}" (createdBy: ${ann.createdBy?._id || ann.createdBy})`);
        });
        console.log('');

        // Now let's check what a frontend token might look like
        console.log('🌐 Frontend Token Analysis:');
        console.log('   The frontend should be using a token with the same structure.');
        console.log('   If the frontend token has a different tenantId or userId,');
        console.log('   the tenant filtering will return different results.\n');

        console.log('🔍 Key Points to Check:');
        console.log('   1. Frontend token should have tenantId:', user.tenantId);
        console.log('   2. Frontend user should be in the tenant users list above');
        console.log('   3. Announcements should be created by users in the same tenant');
        console.log('   4. Check browser localStorage for "token" and "tenant_token"');
        console.log('   5. Decode frontend token and compare with backend token payload\n');

        // Check if there are announcements created by users outside this tenant
        const allAnnouncements = await Announcement.find({}).populate('createdBy', 'username email tenantId');
        console.log('📋 All Announcements in Database:');
        for (const ann of allAnnouncements) {
            const creatorTenant = ann.createdBy?.tenantId || 'Unknown';
            const isInTenant = tenantUserIds.some(id => id.toString() === ann.createdBy?._id?.toString());
            console.log(`   "${ann.title}" - Creator: ${ann.createdBy?.email || 'Unknown'} (Tenant: ${creatorTenant}) - In Query: ${isInTenant ? 'Yes' : 'No'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

compareFrontendBackendAuth();