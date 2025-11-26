/**
 * Check Documents Script
 * 
 * Utility script to list documents in the database
 * Useful for debugging and verification
 * 
 * Usage: node server/scripts/checkDocuments.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Document from '../models/document.model.js';
import User from '../models/user.model.js';

dotenv.config();

/**
 * Check and display documents
 */
const checkDocuments = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const count = await Document.countDocuments();
        console.log(`📊 Total documents in database: ${count}\n`);

        if (count > 0) {
            const documents = await Document.find()
                .populate('employee', 'username email profile')
                .limit(10)
                .sort({ createdAt: -1 });

            console.log('Recent documents (last 10):');
            console.log('─'.repeat(80));
            documents.forEach((doc, index) => {
                const employee = doc.employee 
                    ? `${doc.employee.username} (${doc.employee.email})`
                    : 'No employee';
                const date = new Date(doc.createdAt).toLocaleDateString();
                console.log(`${index + 1}. ${doc.title}`);
                console.log(`   Employee: ${employee}`);
                console.log(`   Type: ${doc.documentType || 'N/A'} | Created: ${date}`);
                console.log('');
            });
            console.log('─'.repeat(80));
        } else {
            console.log('⚠️  No documents found in database!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkDocuments();
