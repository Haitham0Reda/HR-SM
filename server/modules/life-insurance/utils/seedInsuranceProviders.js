/**
 * Utility for automatically seeding default insurance providers for new tenants
 */

import InsuranceProvider from '../models/InsuranceProvider.js';

/**
 * Default Egyptian insurance providers data
 */
const DEFAULT_PROVIDERS = [
    {
        name: 'AXA Egypt',
        nameArabic: 'أكسا مصر',
        code: 'AXA',
        contactInfo: {
            email: 'info@axa-egypt.com',
            phone: '+20-2-2735-0000',
            website: 'https://www.axa-egypt.com',
            address: {
                street: 'Nile City Towers',
                city: 'Cairo',
                governorate: 'Cairo',
                country: 'Egypt'
            }
        },
        insuranceTypes: ['health', 'life', 'accident'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 4.5
    },
    {
        name: 'MetLife Egypt',
        nameArabic: 'متلايف مصر',
        code: 'METLIFE',
        contactInfo: {
            email: 'info@metlife.com.eg',
            phone: '+20-2-2461-9999',
            website: 'https://www.metlife.com.eg',
            address: {
                street: 'Smart Village',
                city: 'Giza',
                governorate: 'Giza',
                country: 'Egypt'
            }
        },
        insuranceTypes: ['health', 'life', 'dental'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 4.3
    },
    {
        name: 'Allianz Egypt',
        nameArabic: 'أليانز مصر',
        code: 'ALLIANZ',
        contactInfo: {
            email: 'info@allianz.com.eg',
            phone: '+20-2-2735-5555',
            website: 'https://www.allianz.com.eg',
            address: {
                street: 'New Cairo',
                city: 'Cairo',
                governorate: 'Cairo',
                country: 'Egypt'
            }
        },
        insuranceTypes: ['health', 'life', 'travel'],
        coverageAreas: ['nationwide', 'international'],
        status: 'active',
        rating: 4.4
    },
    {
        name: 'Bupa Egypt',
        nameArabic: 'بوبا مصر',
        code: 'BUPA',
        contactInfo: {
            email: 'info@bupa.com.eg',
            phone: '+20-2-16023',
            website: 'https://www.bupa.com.eg',
            address: {
                street: 'Maadi',
                city: 'Cairo',
                governorate: 'Cairo',
                country: 'Egypt'
            }
        },
        insuranceTypes: ['health', 'dental', 'vision'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 4.6
    },
    {
        name: 'AIG Egypt',
        nameArabic: 'إيه آي جي مصر',
        code: 'AIG',
        contactInfo: {
            email: 'info@aig.com.eg',
            phone: '+20-2-2735-7777',
            website: 'https://www.aig.com.eg'
        },
        insuranceTypes: ['health', 'life', 'accident', 'travel'],
        coverageAreas: ['nationwide', 'international'],
        status: 'active',
        rating: 4.2
    },
    {
        name: 'Gulf Insurance Group (GIG)',
        nameArabic: 'مجموعة الخليج للتأمين',
        code: 'GIG',
        contactInfo: {
            email: 'info@gig.com.eg',
            phone: '+20-2-2735-8888'
        },
        insuranceTypes: ['health', 'life'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 4.0
    },
    {
        name: 'Misr Insurance',
        nameArabic: 'مصر للتأمين',
        code: 'MISR',
        contactInfo: {
            email: 'info@misrinsurance.com.eg',
            phone: '+20-2-2735-9999'
        },
        insuranceTypes: ['health', 'life', 'accident'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 3.8
    },
    {
        name: 'MedCom Health Care',
        nameArabic: 'ميدكوم للرعاية الصحية',
        code: 'MEDCOM',
        contactInfo: {
            email: 'info@medcom.com.eg',
            phone: '+20-2-16555'
        },
        insuranceTypes: ['health', 'dental'],
        coverageAreas: ['cairo', 'alexandria', 'giza'],
        status: 'active',
        rating: 4.1
    },
    {
        name: 'Medicare Middle East',
        nameArabic: 'ميديكير الشرق الأوسط',
        code: 'MEDICARE',
        contactInfo: {
            email: 'info@medicare-me.com',
            phone: '+20-2-16777'
        },
        insuranceTypes: ['health', 'vision'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 3.9
    },
    {
        name: 'Egyptian French Health Care (Egypt Care)',
        nameArabic: 'الرعاية الصحية المصرية الفرنسية',
        code: 'EGYPTCARE',
        contactInfo: {
            email: 'info@egyptcare.com.eg',
            phone: '+20-2-16888'
        },
        insuranceTypes: ['health', 'dental', 'vision'],
        coverageAreas: ['cairo', 'alexandria'],
        status: 'active',
        rating: 4.3
    },
    {
        name: 'NextCare Egypt',
        nameArabic: 'نكست كير مصر',
        code: 'NEXTCARE',
        contactInfo: {
            email: 'info@nextcare.com.eg',
            phone: '+20-2-19999'
        },
        insuranceTypes: ['health', 'dental'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 4.0
    },
    {
        name: 'GlobeMed Egypt',
        nameArabic: 'جلوب ميد مصر',
        code: 'GLOBEMED',
        contactInfo: {
            email: 'info@globemed.com.eg',
            phone: '+20-2-16111'
        },
        insuranceTypes: ['health', 'vision'],
        coverageAreas: ['nationwide'],
        status: 'active',
        rating: 4.2
    }
];

/**
 * Automatically seed default insurance providers for a new tenant
 * @param {string} tenantId - The tenant ID
 * @param {string} userId - The user ID who created the tenant (optional)
 * @returns {Promise<Object>} Result object with count and success status
 */
export const seedInsuranceProvidersForTenant = async (tenantId, userId = null) => {
    try {
        // Check if providers already exist for this tenant
        const existingCount = await InsuranceProvider.countDocuments({ tenantId });
        if (existingCount > 0) {
            console.log(`Insurance providers already exist for tenant ${tenantId}, skipping seed`);
            return { success: true, count: 0, message: 'Providers already exist' };
        }

        // Prepare providers data with tenant information
        const providersToCreate = DEFAULT_PROVIDERS.map(provider => ({
            ...provider,
            tenantId,
            createdBy: userId,
            history: [{
                action: 'created',
                performedBy: userId,
                timestamp: new Date(),
                notes: 'Auto-seeded default provider for new tenant'
            }]
        }));

        // Insert providers
        const createdProviders = await InsuranceProvider.insertMany(providersToCreate);

        console.log(`✓ Successfully seeded ${createdProviders.length} insurance providers for tenant ${tenantId}`);
        
        return {
            success: true,
            count: createdProviders.length,
            providers: createdProviders,
            message: `Successfully seeded ${createdProviders.length} default insurance providers`
        };
    } catch (error) {
        console.error(`Error seeding insurance providers for tenant ${tenantId}:`, error);
        return {
            success: false,
            count: 0,
            error: error.message,
            message: 'Failed to seed insurance providers'
        };
    }
};

export default seedInsuranceProvidersForTenant;