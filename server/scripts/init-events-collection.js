import multiTenantDB from '../config/multiTenant.js';
import Event from '../modules/events/models/event.model.js';

/**
 * Initialize events collection for a tenant
 * This ensures the collection exists even if no events have been created yet
 */
async function initEventsCollection(tenantId) {
    try {
        console.log(`🔧 Initializing events collection for tenant: ${tenantId}`);
        
        // Get tenant connection
        const tenantConnection = await multiTenantDB.getCompanyConnection(tenantId);
        
        // Get or create the Event model on this connection
        const TenantEvent = tenantConnection.models.Event || 
                           tenantConnection.model('Event', Event.schema);
        
        // Check if collection exists
        const collections = await tenantConnection.db.listCollections({ name: 'events' }).toArray();
        
        if (collections.length === 0) {
            console.log(`📦 Creating events collection for tenant: ${tenantId}`);
            // Create the collection by ensuring indexes
            await TenantEvent.createIndexes();
            console.log(`✅ Events collection created for tenant: ${tenantId}`);
        } else {
            console.log(`✅ Events collection already exists for tenant: ${tenantId}`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Error initializing events collection for tenant ${tenantId}:`, error);
        throw error;
    }
}

/**
 * Initialize events collection for all tenants
 */
async function initEventsCollectionForAllTenants() {
    try {
        console.log('🔧 Initializing events collection for all tenants...');
        
        // Get all tenant IDs from the platform database
        const platformConnection = await multiTenantDB.getPlatformConnection();
        const Company = platformConnection.model('Company');
        const companies = await Company.find({}, 'tenantId');
        
        console.log(`📊 Found ${companies.length} tenants`);
        
        for (const company of companies) {
            await initEventsCollection(company.tenantId);
        }
        
        console.log('✅ Events collection initialized for all tenants');
    } catch (error) {
        console.error('❌ Error initializing events collection for all tenants:', error);
        throw error;
    }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tenantId = process.argv[2];
    
    if (tenantId) {
        initEventsCollection(tenantId)
            .then(() => {
                console.log('✅ Done');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Failed:', error);
                process.exit(1);
            });
    } else {
        initEventsCollectionForAllTenants()
            .then(() => {
                console.log('✅ Done');
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Failed:', error);
                process.exit(1);
            });
    }
}

export { initEventsCollection, initEventsCollectionForAllTenants };
