import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://cluster.uwhj601.mongodb.net/';

async function listCollections() {
    try {
        // Check hrsm_admin
        console.log('\n🔍 Collections in hrsm_admin:');
        const adminConnection = mongoose.createConnection(`${MONGO_URI}hrsm_admin`);
        await adminConnection.asPromise();
        const adminCollections = await adminConnection.db.listCollections().toArray();
        adminCollections.forEach(col => console.log(`  - ${col.name}`));
        await adminConnection.close();

        // Check hrsm_techcorp_solutions
        console.log('\n🔍 Collections in hrsm_techcorp_solutions:');
        const companyConnection = mongoose.createConnection(`${MONGO_URI}hrsm_techcorp_solutions`);
        await companyConnection.asPromise();
        const companyCollections = await companyConnection.db.listCollections().toArray();
        companyCollections.forEach(col => console.log(`  - ${col.name}`));
        
        // Check if there's an employees collection
        if (companyCollections.find(c => c.name === 'employees')) {
            console.log('\n👥 Checking employees collection...');
            const Employee = companyConnection.model('Employee', new mongoose.Schema({}, { strict: false }), 'employees');
            const employees = await Employee.find({}).limit(2).lean();
            console.log(`Found ${employees.length} employees (showing first 2):`);
            employees.forEach((emp, i) => {
                console.log(`\nEmployee ${i + 1}:`);
                console.log(JSON.stringify(emp, null, 2));
            });
        }

        await companyConnection.close();

        console.log('\n✅ Check complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

listCollections();
