// models/license.model.js - PostgreSQL/Sequelize stub
// TODO: Convert to Sequelize model

const MODULES = {
    CORE_HR: 'hr-core',
    ATTENDANCE: 'attendance',
    LEAVE: 'leave',
    PAYROLL: 'payroll',
    DOCUMENTS: 'documents',
    COMMUNICATION: 'communication',
    REPORTING: 'reporting',
    TASKS: 'tasks',
    LOGGING: 'logging'
};

const PRICING_TIERS = ['starter', 'business', 'enterprise'];
const LICENSE_STATUS = ['active', 'trial', 'expired', 'suspended', 'cancelled'];
const BILLING_CYCLES = ['monthly', 'annual'];

// Stub model - needs Sequelize implementation
const License = {
    find: async () => [],
    findOne: async () => null,
    findById: async () => null,
    findByTenantId: async () => null,
    findActiveLicenses: async () => [],
    findExpiringLicenses: async () => [],
    findTrialLicenses: async () => [],
    create: async () => ({}),
    updateOne: async () => ({}),
    deleteOne: async () => ({})
};

export default License;
export { MODULES, PRICING_TIERS, LICENSE_STATUS, BILLING_CYCLES };
