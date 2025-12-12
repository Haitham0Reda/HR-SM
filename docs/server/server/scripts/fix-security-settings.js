/**
 * Migration script to fix SecuritySettings schema
 * Converts old boolean ipWhitelist to new object structure
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-system';

async function fixSecuritySettings() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const SecuritySettings = mongoose.connection.collection('securitysettings');
        
        // Find all documents with boolean ipWhitelist
        const docs = await SecuritySettings.find({
            $or: [
                { ipWhitelist: { $type: 'bool' } },
                { auditLog: { $type: 'bool' } }
            ]
        }).toArray();

        console.log(`Found ${docs.length} documents to fix`);

        for (const doc of docs) {
            const updates = {};

            // Fix ipWhitelist if it's a boolean
            if (typeof doc.ipWhitelist === 'boolean') {
                updates.ipWhitelist = {
                    enabled: doc.ipWhitelist,
                    allowedIPs: []
                };
                console.log(`Fixing ipWhitelist for document ${doc._id}`);
            }

            // Fix auditLog if it's a boolean
            if (typeof doc.auditLog === 'boolean') {
                updates.auditLog = {
                    enabled: doc.auditLog,
                    retentionDays: 90
                };
                console.log(`Fixing auditLog for document ${doc._id}`);
            }

            // Apply updates
            if (Object.keys(updates).length > 0) {
                await SecuritySettings.updateOne(
                    { _id: doc._id },
                    { $set: updates }
                );
                console.log(`Updated document ${doc._id}`);
            }
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixSecuritySettings();
