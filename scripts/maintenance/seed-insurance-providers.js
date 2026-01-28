import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedInsuranceProvidersForTenant } from './server/modules/life-insurance/utils/seedInsuranceProviders.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function seedProviders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const tenantId = 'techcorp_solutions';
    
    console.log(`\n🌱 Seeding insurance providers for tenant: ${tenantId}...`);
    
    const result = await seedInsuranceProvidersForTenant(tenantId);
    
    if (result.success) {
      console.log(`\n✅ ${result.message}`);
      console.log(`📊 Total providers seeded: ${result.count}`);
      
      if (result.providers && result.providers.length > 0) {
        console.log('\n📋 Seeded providers:');
        result.providers.forEach((provider, index) => {
          console.log(`   ${index + 1}. ${provider.name} (${provider.code}) - Rating: ${provider.rating}`);
        });
      }
    } else {
      console.log(`\n⚠️ ${result.message}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

seedProviders();
