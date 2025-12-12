import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../modules/hr-core/users/models/user.model.js';

dotenv.config();

const listUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}).select('username email role');
        console.log('\n👥 All Users:');
        console.log('='.repeat(60));
        users.forEach(user => {
            console.log(`${user.username.padEnd(20)} | ${user.role.padEnd(10)} | ${user.email}`);
        });
        console.log('='.repeat(60));
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

listUsers();
