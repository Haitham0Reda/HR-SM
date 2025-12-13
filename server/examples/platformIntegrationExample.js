/**
 * Platform Integration Example
 * 
 * Shows how to integrate the multi-tenant company management into the existing platform
 */

import express from 'express';
import cors from 'cors';
import { companyRoutes } from '../platform/companies/index.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Platform authentication middleware (you would implement this)
const authenticatePlatform = (req, res, next) => {
    // This would verify platform JWT token
    // For now, we'll just pass through
    req.platformUser = { id: 'platform-admin', role: 'super-admin' };
    next();
};

// Add request ID for tracking
app.use((req, res, next) => {
    req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    next();
});

// Platform routes
app.use('/api/platform/companies', authenticatePlatform, companyRoutes);

// Example: Get all companies
app.get('/api/platform/companies', async (req, res) => {
    // This will return all companies with their metadata, statistics, and available models
});

// Example: Create a new company
app.post('/api/platform/companies', async (req, res) => {
    // Body example:
    // {
    //   "name": "New Tech Company",
    //   "industry": "Technology",
    //   "adminEmail": "admin@newtech.com",
    //   "phone": "+1-555-0123",
    //   "address": "123 Innovation St, Tech City",
    //   "modules": ["hr-core", "attendance", "payroll"],
    //   "settings": {
    //     "timezone": "America/New_York",
    //     "currency": "USD",
    //     "language": "en",
    //     "workingHours": { "start": "09:00", "end": "17:00" },
    //     "weekendDays": [0, 6]
    //   }
    // }
});

// Example: Get company details
app.get('/api/platform/companies/:companyName', async (req, res) => {
    // Returns detailed company information including:
    // - Company metadata
    // - Statistics (user counts, collection counts, etc.)
    // - Collections with document counts
    // - Sample data from key collections
});

// Example: Update company
app.patch('/api/platform/companies/:companyName', async (req, res) => {
    // Update company metadata, settings, enabled modules, etc.
});

// Example: Delete/Archive company
app.delete('/api/platform/companies/:companyName', async (req, res) => {
    // Query parameter: ?permanent=true for permanent deletion
    // Default: soft delete (archive)
});

// Example: Get available modules and models
app.get('/api/platform/companies/modules-and-models', async (req, res) => {
    // Returns all available modules and their associated models
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Platform error:', error);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        meta: {
            timestamp: new Date().toISOString(),
            requestId: req.id || 'unknown'
        }
    });
});

const PORT = process.env.PLATFORM_PORT || 5001;

app.listen(PORT, () => {
    console.log(`Platform server running on port ${PORT}`);
    console.log(`Company management available at: http://localhost:${PORT}/api/platform/companies`);
});

export default app;

/*
API Endpoints Summary:

GET    /api/platform/companies                     - List all companies with metadata
GET    /api/platform/companies/modules-and-models - Get available modules and models
GET    /api/platform/companies/:companyName       - Get detailed company information
POST   /api/platform/companies                     - Create new company
PATCH  /api/platform/companies/:companyName       - Update company metadata
DELETE /api/platform/companies/:companyName       - Delete/Archive company

Response Format:
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2025-12-13T10:00:00Z",
    "requestId": "req_abc123"
  }
}

Example Usage:

1. List all companies:
   GET /api/platform/companies
   
   Response includes:
   - companies: Array of company objects with metadata and statistics
   - totalCompanies: Number of companies
   - availableModels: List of all available models

2. Create a new company:
   POST /api/platform/companies
   {
     "name": "Acme Corp",
     "industry": "Technology",
     "adminEmail": "admin@acme.com",
     "modules": ["hr-core", "attendance", "payroll"]
   }

3. Get company details:
   GET /api/platform/companies/acme_corp
   
   Response includes:
   - company: Full company metadata
   - statistics: Detailed statistics for all collections
   - collections: List of collections with document counts
   - sampleData: Sample documents from key collections

4. Update company:
   PATCH /api/platform/companies/acme_corp
   {
     "modules": ["hr-core", "attendance", "payroll", "reports"],
     "settings": {
       "timezone": "America/Los_Angeles"
     }
   }

5. Archive company:
   DELETE /api/platform/companies/acme_corp
   
   Permanently delete:
   DELETE /api/platform/companies/acme_corp?permanent=true
*/