import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Platform User Schema (simplified version)
const platformUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super-admin', 'admin', 'support', 'ops'],
    default: 'admin'
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PlatformUser = mongoose.model('PlatformUser', platformUserSchema, 'platform_users');

async function recreatePlatformAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing admin
    await PlatformUser.deleteOne({ email: 'admin@platform.local' });
    console.log('🗑️ Deleted existing admin');

    // Create platform admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const platformAdmin = new PlatformUser({
      email: 'admin@platform.local',
      password: hashedPassword,
      role: 'super-admin',
      firstName: 'Platform',
      lastName: 'Administrator',
      name: 'Platform Administrator',
      isActive: true
    });

    await platformAdmin.save();
    
    console.log('✅ Platform admin recreated successfully!');
    console.log('Email: admin@platform.local');
    console.log('Password: admin123');
    console.log('Role: super-admin');

  } catch (error) {
    console.error('❌ Error recreating platform admin:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

recreatePlatformAdmin();