import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Department from './models/department.model.js';
import School from './models/school.model.js';

dotenv.config();

const checkDepartments = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const departments = await Department.find().populate('school', 'name');
        console.log(`\nTotal departments: ${departments.length}\n`);

        if (departments.length > 0) {
            console.log('Departments:');
            departments.forEach((dept, index) => {
                console.log(`${index + 1}. ${dept.name} (${dept.code}) - School: ${dept.school?.name || 'N/A'}`);
            });
        } else {
            console.log('No departments found in database!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDepartments();
