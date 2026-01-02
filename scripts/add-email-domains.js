/**
 * Migration Script: Add Email Domains to Existing Companies
 * 
 * This script helps add email domains to existing companies that don't have one configured.
 * Run this script after deploying the email generation feature.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../server/platform/models/Company.js';

// Load environment variables
dotenv.config();

async function connectToDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables');
        }
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
}

async function addEmailDomains() {
    try {
        console.log('🔍 Finding companies without email domains...\n');
        
        // Find companies without emailDomain field
        const companiesWithoutDomain = await Company.find({
            $or: [
                { emailDomain: { $exists: false } },
                { emailDomain: null },
                { emailDomain: '' }
            ]
        });

        if (companiesWithoutDomain.length === 0) {
            console.log('✅ All companies already have email domains configured!');
            return;
        }

        console.log(`Found ${companiesWithoutDomain.length} companies without email domains:\n`);

        for (const company of companiesWithoutDomain) {
            console.log(`📋 Company: ${company.name} (${company.slug})`);
            console.log(`   Admin Email: ${company.adminEmail}`);
            
            // Extract domain from admin email as a suggestion
            const adminEmailDomain = company.adminEmail.split('@')[1];
            const suggestedDomain = adminEmailDomain || `${company.slug}.com`;
            
            console.log(`   Suggested Domain: ${suggestedDomain}`);
            
            // For this script, we'll use the suggested domain
            // In a real scenario, you might want to prompt for input or use a mapping
            try {
                await Company.findByIdAndUpdate(
                    company._id,
                    { emailDomain: suggestedDomain },
                    { new: true, runValidators: true }
                );
                console.log(`   ✅ Updated with domain: ${suggestedDomain}\n`);
            } catch (updateError) {
                console.log(`   ❌ Failed to update: ${updateError.message}\n`);
            }
        }

        console.log('🎉 Migration completed!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    }
}

async function verifyEmailDomains() {
    try {
        console.log('\n🔍 Verifying all companies have email domains...\n');
        
        const allCompanies = await Company.find({}, 'name slug emailDomain adminEmail');
        
        console.log('📊 Company Email Domain Status:');
        console.log('================================');
        
        let companiesWithDomains = 0;
        let companiesWithoutDomains = 0;
        
        for (const company of allCompanies) {
            const hasDomain = company.emailDomain && company.emailDomain.trim() !== '';
            const status = hasDomain ? '✅' : '❌';
            
            console.log(`${status} ${company.name} (${company.slug})`);
            console.log(`    Domain: ${company.emailDomain || 'NOT SET'}`);
            console.log(`    Admin: ${company.adminEmail}`);
            console.log('');
            
            if (hasDomain) {
                companiesWithDomains++;
            } else {
                companiesWithoutDomains++;
            }
        }
        
        console.log('📈 Summary:');
        console.log(`   Companies with domains: ${companiesWithDomains}`);
        console.log(`   Companies without domains: ${companiesWithoutDomains}`);
        console.log(`   Total companies: ${allCompanies.length}`);
        
        if (companiesWithoutDomains === 0) {
            console.log('\n🎉 All companies have email domains configured!');
        } else {
            console.log('\n⚠️  Some companies still need email domains configured.');
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        throw error;
    }
}

async function main() {
    try {
        await connectToDatabase();
        
        console.log('🚀 Starting Email Domain Migration\n');
        console.log('This script will add email domains to companies that don\'t have them configured.\n');
        
        // First, show current status
        await verifyEmailDomains();
        
        // Add email domains to companies that need them
        await addEmailDomains();
        
        // Verify the results
        await verifyEmailDomains();
        
    } catch (error) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Handle script arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'verify') {
    // Just verify, don't migrate
    connectToDatabase()
        .then(verifyEmailDomains)
        .then(() => mongoose.disconnect())
        .then(() => console.log('\n👋 Disconnected from MongoDB'))
        .catch(error => {
            console.error('❌ Script failed:', error.message);
            process.exit(1);
        });
} else {
    // Run full migration
    main();
}

// Usage examples:
// node scripts/add-email-domains.js          # Run full migration
// node scripts/add-email-domains.js verify  # Just verify current status