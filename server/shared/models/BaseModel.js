import mongoose from 'mongoose';

// Base schema plugin for multi-tenancy and audit fields
export const baseSchemaPlugin = (schema) => {
    // Add common fields to all schemas
    schema.add({
        tenantId: {
            type: String,
            required: true,
            index: true // Add index here to prevent duplicates
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    });

    // Add timestamps
    schema.set('timestamps', true);

    // Automatically filter by tenantId on all queries
    schema.pre(/^find/, function (next) {
        if (this.getQuery().tenantId === undefined && this._tenantId) {
            this.where({ tenantId: this._tenantId });
        }
        next();
    });

    // Add tenant context method
    schema.statics.withTenant = function (tenantId) {
        const query = this.find();
        query._tenantId = tenantId;
        return query;
    };

    // Ensure tenantId on save
    schema.pre('save', function (next) {
        if (!this.tenantId && this._tenantId) {
            this.tenantId = this._tenantId;
        }
        next();
    });
};

export default baseSchemaPlugin;
