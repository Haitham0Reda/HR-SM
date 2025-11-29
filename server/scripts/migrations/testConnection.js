import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

import Leave from '../../models/leave.model.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'Found' : 'Not found');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const leaveCount = await Leave.countDocuments();
    console.log(`Total leaves in database: ${leaveCount}`);

    const missionCount = await Leave.countDocuments({ leaveType: 'mission' });
    const sickCount = await Leave.countDocuments({ leaveType: 'sick' });
    const annualCount = await Leave.countDocuments({ leaveType: 'annual' });
    const casualCount = await Leave.countDocuments({ leaveType: 'casual' });
    const unpaidCount = await Leave.countDocuments({ leaveType: 'unpaid' });

    console.log(`\nLeave breakdown:`);
    console.log(`  - Missions: ${missionCount}`);
    console.log(`  - Sick leaves: ${sickCount}`);
    console.log(`  - Annual: ${annualCount}`);
    console.log(`  - Casual: ${casualCount}`);
    console.log(`  - Unpaid: ${unpaidCount}`);

    await mongoose.connection.close();
    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
