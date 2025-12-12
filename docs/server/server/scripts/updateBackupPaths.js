import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Backup from '../modules/hr-core/backup/models/backup.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const updatePaths = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        
        await Backup.updateMany(
            { backupType: 'full' },
            { $set: { 'sources.filePaths': ['./server/uploads'] } }
        );
        
        console.log('✅ Updated backup file paths');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

updatePaths();
