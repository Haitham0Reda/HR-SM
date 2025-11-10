import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Document from './models/document.model.js';
import User from './models/user.model.js';

const checkDocuments = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const count = await Document.countDocuments();
        console.log(`Total documents in database: ${count}`);

        const documents = await Document.find()
            .populate('employee', 'username email profile')
            .limit(5);

        console.log('\nFirst 5 documents:');
        documents.forEach((doc, index) => {
            console.log(`${index + 1}. ${doc.title} - Employee: ${doc.employee?.username || 'None'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDocuments();
