/**
 * Department Model
 * 
 * Manages organizational departments with hierarchical structure
 */
import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Department name is required'],
        trim: true,
        maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    arabicName: {
        type: String,
        trim: true,
        maxlength: [100, 'Arabic name cannot exceed 100 characters']
    },
    
    // Department Code
    code: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true
    },
    
    // Hierarchical Structure
    parentDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null // null indicates a main/root department
    },
    
    // Management
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Description
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    arabicDescription: {
        type: String,
        maxlength: [500, 'Arabic description cannot exceed 500 characters']
    },
    
    // Contact Information
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
        type: String,
        trim: true
    },
    extension: {
        type: String,
        trim: true
    },
    
    // Location
    location: {
        building: String,
        floor: String,
        room: String
    },
    
    // Budget & Cost Center
    costCenter: {
        type: String,
        trim: true
    },
    budget: {
        annual: {
            type: Number,
            default: 0
        },
        currency: {
            type: String,
            default: 'EGP'
        }
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ parentDepartment: 1 });
departmentSchema.index({ manager: 1 });
departmentSchema.index({ isActive: 1, parentDepartment: 1 });

// Virtual for full name (with parent)
departmentSchema.virtual('fullName').get(function () {
    if (this.parentDepartment && this.parentDepartment.name) {
        return `${this.parentDepartment.name} - ${this.name}`;
    }
    return this.name;
});

// Virtual for employee count
departmentSchema.virtual('employeeCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'department',
    count: true
});

// Virtual for sub-departments
departmentSchema.virtual('subDepartments', {
    ref: 'Department',
    localField: '_id',
    foreignField: 'parentDepartment'
});

// Auto-generate unique department code
departmentSchema.pre('save', async function (next) {
    if (!this.code) {
        try {
            // Generate code based on parent
            if (this.parentDepartment) {
                // For sub-departments, use parent code + sequential number
                const parent = await this.constructor.findById(this.parentDepartment);
                if (parent && parent.code) {
                    const siblings = await this.constructor.find({
                        parentDepartment: this.parentDepartment
                    }).sort({ code: -1 }).limit(1);
                    
                    let subNumber = 1;
                    if (siblings.length > 0 && siblings[0].code) {
                        const lastSubCode = siblings[0].code.split('-')[1];
                        if (lastSubCode) {
                            subNumber = parseInt(lastSubCode) + 1;
                        }
                    }
                    
                    this.code = `${parent.code}-${subNumber.toString().padStart(2, '0')}`;
                }
            } else {
                // For main departments, use sequential 3-digit code
                const lastDepartment = await this.constructor.findOne({
                    parentDepartment: null
                }).sort({ code: -1 }).limit(1);
                
                let nextNumber = 1;
                if (lastDepartment && lastDepartment.code) {
                    const lastNumber = parseInt(lastDepartment.code.split('-')[0]);
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }
                
                this.code = nextNumber.toString().padStart(3, '0');
            }
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Prevent circular parent-child relationships
departmentSchema.pre('save', async function (next) {
    if (this.parentDepartment && this.isModified('parentDepartment')) {
        // Check if parent is trying to be set to self
        if (this.parentDepartment.toString() === this._id.toString()) {
            return next(new Error('A department cannot be its own parent'));
        }
        
        // Check for circular reference
        let currentParent = this.parentDepartment;
        const visited = new Set([this._id.toString()]);
        
        while (currentParent) {
            if (visited.has(currentParent.toString())) {
                return next(new Error('Circular parent-child relationship detected'));
            }
            
            visited.add(currentParent.toString());
            const parent = await this.constructor.findById(currentParent);
            
            if (!parent) break;
            currentParent = parent.parentDepartment;
        }
    }
    next();
});

// Static method to get department hierarchy
departmentSchema.statics.getHierarchy = async function (departmentId = null) {
    const departments = await this.find({
        parentDepartment: departmentId,
        isActive: true
    })
    .populate('manager', 'username email profile')
    .sort({ name: 1 });
    
    const hierarchy = [];
    
    for (const dept of departments) {
        const deptObj = dept.toObject();
        deptObj.children = await this.getHierarchy(dept._id);
        hierarchy.push(deptObj);
    }
    
    return hierarchy;
};

// Static method to get all parent departments
departmentSchema.statics.getParentChain = async function (departmentId) {
    const chain = [];
    let currentDept = await this.findById(departmentId);
    
    while (currentDept) {
        chain.unshift(currentDept);
        if (currentDept.parentDepartment) {
            currentDept = await this.findById(currentDept.parentDepartment);
        } else {
            break;
        }
    }
    
    return chain;
};

// Instance method to check if department has sub-departments
departmentSchema.methods.hasSubDepartments = async function () {
    const count = await this.constructor.countDocuments({
        parentDepartment: this._id
    });
    return count > 0;
};

// Instance method to get all descendants
departmentSchema.methods.getAllDescendants = async function () {
    const descendants = [];
    
    const getChildren = async (parentId) => {
        const children = await this.constructor.find({
            parentDepartment: parentId
        });
        
        for (const child of children) {
            descendants.push(child);
            await getChildren(child._id);
        }
    };
    
    await getChildren(this._id);
    return descendants;
};

export default mongoose.model('Department', departmentSchema);
