import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vacation from '../modules/hr-core/vacations/models/vacation.model.js';
import User from '../modules/hr-core/users/models/user.model.js';

dotenv.config();

const checkVacationData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check vacation records
        console.log('\n=== CHECKING VACATION RECORDS ===');
        const vacations = await Vacation.find()
            .populate('user', 'username email employeeId personalInfo')
            .limit(5);
        
        console.log(`Total vacation records: ${await Vacation.countDocuments()}`);
        
        vacations.forEach(vac => {
            console.log('\nVacation ID:', vac._id);
            console.log('Year:', vac.year);
            console.log('User (raw ID):', vac.user?._id || vac.user);
            console.log('User Object:', vac.user ? {
                username: vac.user.username,
                fullName: vac.user.personalInfo?.fullName
            } : 'NULL');
        });

        // Check for invalid references
        const allVacations = await Vacation.find();
        let invalidCount = 0;
        
        for (const vac of allVacations) {
            await vac.populate('user');
            if (!vac.user) {
                invalidCount++;
            }
        }

        console.log('\n\n=== STATISTICS ===');
        console.log('Total vacations:', allVacations.length);
        console.log('Invalid employee references:', invalidCount);

        await mongoose.connection.close();
        console.log('\n\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkVacationData();
