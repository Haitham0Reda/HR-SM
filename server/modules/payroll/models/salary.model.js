/**
 * Salary Model
 * 
 * Manages employee salary information with history tracking and encryption
 */
import mongoose from 'mongoose';
import { encryptSalary, decryptSalary } from '../../../utils/encryption.js';

const salarySchema = new mongoose.Schema({
    // Tenant ID for multi-tenancy
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    
    // Employee reference
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Encrypted Salary Information
    baseSalaryEncrypted: {
        type: String,
        required: true
    },
    
    // Encrypted Additional allowances
    allowancesEncrypted: {
        housing: { type: String, default: null },
        transportation: { type: String, default: null },
        medical: { type: String, default: null },
        food: { type: String, default: null },
        other: { type: String, default: null }
    },
    
    // Encrypted Total gross salary (base + allowances)
    grossSalaryEncrypted: {
        type: String,
        required: true
    },
    
    // Currency
    currency: {
        type: String,
        default: 'EGP',
        enum: ['EGP', 'USD', 'EUR']
    },
    
    // Effective date
    effectiveDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'active'
    },
    
    // Approval information
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    
    // Notes (not encrypted as they're not sensitive)
    notes: {
        type: String,
        maxlength: 500
    },
    
    // Created by
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for multi-tenant queries
salarySchema.index({ tenantId: 1, employee: 1, effectiveDate: -1 });
salarySchema.index({ tenantId: 1, status: 1 });
salarySchema.index({ tenantId: 1, createdAt: -1 });

// Virtual properties for decrypted values (only accessible when needed)
salarySchema.virtual('baseSalary').get(function() {
    try {
        return this.baseSalaryEncrypted ? decryptSalary(this.baseSalaryEncrypted) : 0;
    } catch (error) {
        console.error('Error decrypting base salary:', error);
        return 0;
    }
});

salarySchema.virtual('allowances').get(function() {
    try {
        return {
            housing: this.allowancesEncrypted?.housing ? decryptSalary(this.allowancesEncrypted.housing) : 0,
            transportation: this.allowancesEncrypted?.transportation ? decryptSalary(this.allowancesEncrypted.transportation) : 0,
            medical: this.allowancesEncrypted?.medical ? decryptSalary(this.allowancesEncrypted.medical) : 0,
            food: this.allowancesEncrypted?.food ? decryptSalary(this.allowancesEncrypted.food) : 0,
            other: this.allowancesEncrypted?.other ? decryptSalary(this.allowancesEncrypted.other) : 0
        };
    } catch (error) {
        console.error('Error decrypting allowances:', error);
        return { housing: 0, transportation: 0, medical: 0, food: 0, other: 0 };
    }
});

salarySchema.virtual('grossSalary').get(function() {
    try {
        return this.grossSalaryEncrypted ? decryptSalary(this.grossSalaryEncrypted) : 0;
    } catch (error) {
        console.error('Error decrypting gross salary:', error);
        return 0;
    }
});

// Virtual for total allowances
salarySchema.virtual('totalAllowances').get(function() {
    const allowances = this.allowances;
    return allowances.housing + allowances.transportation + allowances.medical + allowances.food + allowances.other;
});

// Pre-save middleware to encrypt salary data
salarySchema.pre('save', function(next) {
    try {
        let baseSalary = 0;
        let totalAllowances = 0;
        
        // Handle direct salary data assignment (for new records)
        if (this.get('baseSalary') !== undefined && !this.baseSalaryEncrypted) {
            baseSalary = this.get('baseSalary') || 0;
            this.baseSalaryEncrypted = encryptSalary(baseSalary);
            this.unset('baseSalary'); // Remove the plain text field
        } else if (this.baseSalaryEncrypted) {
            // If already encrypted, decrypt to get the value for gross calculation
            baseSalary = decryptSalary(this.baseSalaryEncrypted);
        }
        
        // Handle direct allowances assignment (for new records)
        if (this.get('allowances') !== undefined && !this.allowancesEncrypted.housing) {
            const allowances = this.get('allowances') || {};
            this.allowancesEncrypted = {
                housing: allowances.housing ? encryptSalary(allowances.housing) : null,
                transportation: allowances.transportation ? encryptSalary(allowances.transportation) : null,
                medical: allowances.medical ? encryptSalary(allowances.medical) : null,
                food: allowances.food ? encryptSalary(allowances.food) : null,
                other: allowances.other ? encryptSalary(allowances.other) : null
            };
            
            // Calculate total allowances
            totalAllowances = (allowances.housing || 0) + 
                             (allowances.transportation || 0) + 
                             (allowances.medical || 0) + 
                             (allowances.food || 0) + 
                             (allowances.other || 0);
            
            this.unset('allowances'); // Remove the plain text field
        } else if (this.allowancesEncrypted) {
            // If already encrypted, decrypt to get the values for gross calculation
            totalAllowances = (this.allowancesEncrypted.housing ? decryptSalary(this.allowancesEncrypted.housing) : 0) +
                             (this.allowancesEncrypted.transportation ? decryptSalary(this.allowancesEncrypted.transportation) : 0) +
                             (this.allowancesEncrypted.medical ? decryptSalary(this.allowancesEncrypted.medical) : 0) +
                             (this.allowancesEncrypted.food ? decryptSalary(this.allowancesEncrypted.food) : 0) +
                             (this.allowancesEncrypted.other ? decryptSalary(this.allowancesEncrypted.other) : 0);
        }
        
        // Calculate and encrypt gross salary if not already encrypted
        if (!this.grossSalaryEncrypted) {
            const grossSalary = baseSalary + totalAllowances;
            this.grossSalaryEncrypted = encryptSalary(grossSalary);
        }
        
        next();
    } catch (error) {
        console.error('Error in salary pre-save middleware:', error);
        next(error);
    }
});

// Static method to get current salary for employee
salarySchema.statics.getCurrentSalary = async function(employeeId, tenantId) {
    return await this.findOne({
        employee: employeeId,
        tenantId: tenantId,
        status: 'active'
    }).sort({ effectiveDate: -1 });
};

// Static method to get salary history for employee
salarySchema.statics.getSalaryHistory = async function(employeeId, tenantId) {
    return await this.find({
        employee: employeeId,
        tenantId: tenantId
    }).sort({ effectiveDate: -1 });
};

export default mongoose.model('Salary', salarySchema);