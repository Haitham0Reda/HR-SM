import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_URI = process.env.MONGODB_URI || 'mongodb+srv://cluster.uwhj601.mongodb.net/hrsm_admin';
const COMPANY_URI = 'mongodb+srv://cluster.uwhj601.mongodb.net/hrsm_techcorp_solutions';
const TENANT_ID = 'techcorp_solutions';

async function migrateDocuments() {
    try {
        console.log('Starting document migration...\n');

        // Connect to admin database
        const adminConn = await mongoose.createConnection(ADMIN_URI, {
            user: process.env.MONGODB_USER,
            pass: process.env.MONGODB_PASSWORD,
            authSource: 'admin'
        });
        console.log('✓ Connected to hrsm_admin');

        // Connect to company database
        const companyConn = await mongoose.createConnection(COMPANY_URI, {
            user: process.env.MONGODB_USER,
            pass: process.env.MONGODB_PASSWORD,
            authSource: 'admin'
        });
        console.log('✓ Connected to hrsm_techcorp_solutions\n');

        // Define Document schema
        const documentSchema = new mongoose.Schema({
            title: String,
            arabicTitle: String,
            type: String,
            employee: mongoose.Schema.Types.ObjectId,
            department: mongoose.Schema.Types.ObjectId,
            fileUrl: String,
            fileName: String,
            fileSize: Number,
            mimeType: String,
            uploadedBy: mongoose.Schema.Types.ObjectId,
            updatedBy: mongoose.Schema.Types.ObjectId,
            isConfidential: Boolean,
            description: String,
            expiryDate: Date,
            tenantId: String
        }, { timestamps: true });

        // Get models
        const AdminDocument = adminConn.model('Document', documentSchema);
        const CompanyDocument = companyConn.model('Document', documentSchema);

        // Find documents in admin database
        const adminDocs = await AdminDocument.find({});
        console.log(`Found ${adminDocs.length} documents in admin database\n`);

        if (adminDocs.length === 0) {
            console.log('No documents to migrate.');
            await adminConn.close();
            await companyConn.close();
            process.exit(0);
        }

        // Migrate each document
        let migrated = 0;
        let errors = 0;

        for (const doc of adminDocs) {
            try {
                console.log(`Migrating: ${doc.title || doc.fileName}`);
                console.log(`  Type: ${doc.type}`);
                console.log(`  Current TenantId: ${doc.tenantId}`);

                // Create document in company database
                const newDoc = new CompanyDocument({
                    title: doc.title,
                    arabicTitle: doc.arabicTitle,
                    type: doc.type,
                    employee: doc.employee,
                    department: doc.department,
                    fileUrl: doc.fileUrl,
                    fileName: doc.fileName,
                    fileSize: doc.fileSize,
                    mimeType: doc.mimeType,
                    uploadedBy: doc.uploadedBy,
                    updatedBy: doc.updatedBy,
                    isConfidential: doc.isConfidential,
                    description: doc.description,
                    expiryDate: doc.expiryDate,
                    tenantId: TENANT_ID,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt
                });

                await newDoc.save();
                console.log(`  ✓ Created in company database with ID: ${newDoc._id}`);

                // Delete from admin database
                await AdminDocument.deleteOne({ _id: doc._id });
                console.log(`  ✓ Deleted from admin database`);
                console.log('');

                migrated++;
            } catch (error) {
                console.error(`  ✗ Error migrating document: ${error.message}`);
                console.log('');
                errors++;
            }
        }

        // Summary
        console.log('=== MIGRATION SUMMARY ===');
        console.log(`Total documents found: ${adminDocs.length}`);
        console.log(`Successfully migrated: ${migrated}`);
        console.log(`Errors: ${errors}`);

        if (migrated > 0) {
            console.log('\n✓ Migration completed successfully!');
            console.log('Documents are now in the correct database (hrsm_techcorp_solutions)');
        }

        await adminConn.close();
        await companyConn.close();
        console.log('\nConnections closed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateDocuments();
