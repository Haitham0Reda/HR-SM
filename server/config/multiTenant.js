/**
 * Multi-Tenant Database Configuration
 * 
 * Handles database connections for multiple companies
 * Each company gets its own database within the MongoDB cluster
 */

import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class MultiTenantDB {
    constructor() {
        this.connections = new Map();
        // Handle both MONGODB_URI and MONGO_URI, and ensure we have a valid connection string
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables. Please set MONGODB_URI or MONGO_URI.');
        }
        
        // Extract the base URI without database name
        const uriParts = mongoUri.split('/');
        const baseUri = uriParts.slice(0, -1).join('/');
        const queryParams = uriParts[uriParts.length - 1].split('?')[1];
        this.baseConnectionString = baseUri + '/' + (queryParams ? '?' + queryParams : '');
    }

    /**
     * Get database connection for a specific company
     * @param {string} companyName - Company identifier (will be sanitized)
     * @returns {Promise<mongoose.Connection>}
     */
    async getCompanyConnection(companyName) {
        const sanitizedName = this.sanitizeCompanyName(companyName);
        const dbName = `hrsm_${sanitizedName}`;

        if (this.connections.has(dbName)) {
            return this.connections.get(dbName);
        }

        try {
            // Build connection string properly
            const hasQuery = this.baseConnectionString.includes('?');
            const connectionString = hasQuery ? 
                this.baseConnectionString.replace('?', `${dbName}?`) :
                `${this.baseConnectionString}${dbName}`;
            
            const connection = await mongoose.createConnection(connectionString, {
                maxPoolSize: 10,
                minPoolSize: 2,
                maxIdleTimeMS: 30000,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000,
                retryWrites: true,
                retryReads: true,
                bufferCommands: true,
                heartbeatFrequencyMS: 10000,
                w: 'majority',
                readPreference: 'primary',
                compressors: ['zlib'],
            });

            this.connections.set(dbName, connection);
            
            console.log(`Connected to company database: ${dbName}`);
            
            // Create company directories
            await this.createCompanyDirectories(sanitizedName);
            
            return connection;
        } catch (error) {
            console.error(`Error connecting to company database ${dbName}:`, error.message);
            throw error;
        }
    }

    /**
     * Sanitize company name for database usage
     * @param {string} companyName 
     * @returns {string}
     */
    sanitizeCompanyName(companyName) {
        return companyName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 50); // MongoDB database name limit
    }

    /**
     * Create backup and upload directories for company
     * @param {string} sanitizedCompanyName 
     */
    async createCompanyDirectories(sanitizedCompanyName) {
        const directories = [
            `backups/${sanitizedCompanyName}`,
            `uploads/${sanitizedCompanyName}`,
            `server/uploads/${sanitizedCompanyName}`,
            `server/backups/${sanitizedCompanyName}`
        ];

        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    console.error(`Error creating directory ${dir}:`, error.message);
                }
            }
        }
    }

    /**
     * List all company databases
     * @returns {Promise<string[]>}
     */
    async listCompanyDatabases() {
        try {
            // Use the main connection to list databases
            const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
            const mainConnection = await mongoose.createConnection(mongoUri);

            // Wait for connection to be ready
            await new Promise((resolve, reject) => {
                mainConnection.once('open', resolve);
                mainConnection.once('error', reject);
            });

            // Get admin database and list databases
            const adminDb = mainConnection.db.admin();
            if (!adminDb) {
                throw new Error('Cannot access admin database');
            }

            const result = await adminDb.listDatabases();
            
            const companyDbs = result.databases
                .filter(db => db.name.startsWith('hrsm_') && db.name !== 'hrsm_db')
                .map(db => db.name.replace('hrsm_', ''));

            await mainConnection.close();
            return companyDbs;
        } catch (error) {
            console.error('Error listing company databases:', error.message);
            
            // Fallback: check if we have any connections in our map
            const existingCompanies = Array.from(this.connections.keys())
                .filter(dbName => dbName.startsWith('hrsm_') && dbName !== 'hrsm_db')
                .map(dbName => dbName.replace('hrsm_', ''));
            
            return existingCompanies;
        }
    }

    /**
     * Create a new company database with initial setup
     * @param {string} companyName 
     * @param {Object} companyData 
     * @returns {Promise<mongoose.Connection>}
     */
    async createCompanyDatabase(companyName, companyData = {}) {
        const connection = await this.getCompanyConnection(companyName);
        const sanitizedName = this.sanitizeCompanyName(companyName);

        // Create initial company record
        const CompanyModel = connection.model('Company', new mongoose.Schema({
            name: { type: String, required: true },
            sanitizedName: { type: String, required: true, unique: true },
            createdAt: { type: Date, default: Date.now },
            isActive: { type: Boolean, default: true },
            adminEmail: { type: String },
            phone: { type: String },
            address: { type: String },
            industry: { type: String },
            modules: [{ type: String }],
            settings: {
                timezone: { type: String },
                currency: { type: String },
                language: { type: String },
                workingHours: {
                    start: { type: String },
                    end: { type: String }
                },
                weekendDays: [{ type: Number }]
            }
        }));

        try {
            await CompanyModel.create({
                name: companyName,
                sanitizedName: sanitizedName,
                ...companyData
            });

            console.log(`Company database created successfully: ${companyName}`);
            return connection;
        } catch (error) {
            console.error(`Error creating company database ${companyName}:`, error.message);
            throw error;
        }
    }

    /**
     * Close all company connections
     */
    async closeAllConnections() {
        for (const [dbName, connection] of this.connections) {
            try {
                await connection.close();
                console.log(`Closed connection to ${dbName}`);
            } catch (error) {
                console.error(`Error closing connection to ${dbName}:`, error.message);
            }
        }
        this.connections.clear();
    }

    /**
     * Get company backup directory path
     * @param {string} companyName 
     * @returns {string}
     */
    getCompanyBackupPath(companyName) {
        const sanitizedName = this.sanitizeCompanyName(companyName);
        return path.join(process.cwd(), 'backups', sanitizedName);
    }

    /**
     * Get company upload directory path
     * @param {string} companyName 
     * @returns {string}
     */
    getCompanyUploadPath(companyName) {
        const sanitizedName = this.sanitizeCompanyName(companyName);
        return path.join(process.cwd(), 'uploads', sanitizedName);
    }
}

// Singleton instance
const multiTenantDB = new MultiTenantDB();

export default multiTenantDB;
export { MultiTenantDB };