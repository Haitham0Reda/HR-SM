/**
 * ID Card Model
 * 
 * Manages employee ID card printing, tracking, and administration.
 * Supports individual and bulk printing operations with comprehensive logging.
 * 
 * Features:
 * - Individual and bulk ID card printing
 * - Print activity logging and audit trail
 * - ID Card Admin role support
 * - Print statistics and monitoring
 * - Card status tracking (active, expired, lost, replaced)
 * - QR code generation for verification
 * - Integration with employee data
 */
import mongoose from 'mongoose';

const idCardSchema = new mongoose.Schema({
    // Employee reference
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Employee's department (denormalized for faster queries)
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },

    // Employee's school/campus (denormalized)
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        index: true
    },

    // Employee's position (denormalized)
    position: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Position'
    },

    // Card number (unique identifier)
    cardNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Card type
    cardType: {
        type: String,
        enum: ['employee', 'contractor', 'visitor', 'temporary'],
        default: 'employee',
        index: true
    },

    // Card status
    status: {
        type: String,
        enum: ['active', 'expired', 'suspended', 'lost', 'stolen', 'replaced', 'cancelled'],
        default: 'active',
        index: true
    },

    // Issue information
    issue: {
        issuedDate: {
            type: Date,
            default: Date.now,
            required: true
        },
        issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        issueReason: {
            type: String,
            enum: ['new-hire', 'replacement', 'renewal', 'lost', 'damaged', 'upgrade'],
            default: 'new-hire'
        },
        issueNotes: String
    },

    // Expiry information
    expiry: {
        expiryDate: {
            type: Date,
            required: true,
            index: true
        },
        autoRenew: {
            type: Boolean,
            default: true
        },
        renewalNoticeSent: {
            type: Boolean,
            default: false
        },
        renewalNoticeDate: Date
    },

    // Print history tracking
    printHistory: [{
        printedAt: {
            type: Date,
            default: Date.now
        },
        printedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        printType: {
            type: String,
            enum: ['individual', 'bulk', 'reprint'],
            default: 'individual'
        },
        batchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IDCardBatch'
        },
        printReason: String,
        printStatus: {
            type: String,
            enum: ['success', 'failed', 'pending'],
            default: 'success'
        },
        printerName: String,
        errorMessage: String
    }],

    // Card design/template
    template: {
        templateId: String,
        templateName: String,
        orientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        },
        includePhoto: {
            type: Boolean,
            default: true
        },
        includeQRCode: {
            type: Boolean,
            default: true
        },
        includeBarcode: {
            type: Boolean,
            default: false
        }
    },

    // QR Code data for verification
    qrCode: {
        data: String,  // Encrypted employee data
        generatedAt: Date,
        url: String   // URL to QR code image
    },

    // Barcode (if applicable)
    barcode: {
        data: String,
        format: {
            type: String,
            enum: ['CODE128', 'CODE39', 'EAN13', 'UPC'],
            default: 'CODE128'
        }
    },

    // Access permissions (if integrated with access control)
    accessPermissions: {
        buildings: [String],
        floors: [String],
        rooms: [String],
        timeRestrictions: {
            startTime: String,  // HH:MM format
            endTime: String     // HH:MM format
        }
    },

    // Previous card reference (for replacements)
    previousCard: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IDCard'
    },

    // Replacement information (if this card was replaced)
    replacement: {
        replacedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IDCard'
        },
        originalCard: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'IDCard'
        },
        replacementDate: Date,
        replacementReason: {
            type: String,
            enum: ['lost', 'stolen', 'damaged', 'expired', 'upgrade']
        }
    },

    // Physical card status
    physical: {
        received: {
            type: Boolean,
            default: false
        },
        receivedDate: Date,
        receivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        signature: String  // URL to signature image
    },

    // Notifications sent
    notifications: {
        issued: {
            sent: Boolean,
            sentAt: Date
        },
        renewal: {
            sent: Boolean,
            sentAt: Date
        },
        expired: {
            sent: Boolean,
            sentAt: Date
        }
    },

    // Additional metadata
    metadata: {
        bloodType: String,
        emergencyContact: {
            name: String,
            phone: String
        },
        customFields: mongoose.Schema.Types.Mixed
    },

    // Notes and remarks
    notes: String,

    // Active flag
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true
});

// Virtual to check if card is expired
idCardSchema.virtual('isExpired').get(function () {
    return new Date() > this.expiry.expiryDate;
});

// Virtual to check if card needs renewal soon (within 30 days)
idCardSchema.virtual('needsRenewal').get(function () {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return this.expiry.expiryDate <= thirtyDaysFromNow && !this.isExpired;
});

// Virtual to get days until expiry
idCardSchema.virtual('daysUntilExpiry').get(function () {
    const today = new Date();
    const expiry = new Date(this.expiry.expiryDate);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual to get total print count
idCardSchema.virtual('printCount').get(function () {
    return this.printHistory.length;
});

// Note: Middleware hooks moved to idCardMiddleware.js
// Use middleware functions in routes for better separation of concerns

/**
 * Instance method to log print activity
 * 
 * @param {ObjectId} printedBy - User who printed the card
 * @param {String} printType - Type of print (individual, bulk, reprint)
 * @param {String} reason - Reason for printing
 * @param {ObjectId} batchId - Batch ID (for bulk prints)
 * @returns {Promise<IDCard>} Updated card
 */
idCardSchema.methods.logPrint = async function (printedBy, printType = 'individual', reason = '', batchId = null) {
    this.printHistory.push({
        printedAt: new Date(),
        printedBy,
        printType,
        printReason: reason,
        batchId,
        printStatus: 'success'
    });

    return await this.save();
};

/**
 * Instance method to mark card as expired
 * 
 * @returns {Promise<IDCard>} Updated card
 */
idCardSchema.methods.markExpired = async function () {
    this.status = 'expired';
    this.isActive = false;
    return await this.save();
};

/**
 * Instance method to replace card
 * 
 * @param {ObjectId} issuedBy - User issuing replacement
 * @param {String} reason - Reason for replacement
 * @returns {Promise<IDCard>} New replacement card
 */
idCardSchema.methods.replaceCard = async function (issuedBy, reason) {
    // Mark current card as replaced
    this.status = 'replaced';
    this.isActive = false;

    // Generate card number
    const User = mongoose.model('User');
    const employee = await User.findById(this.employee).select('employeeId');
    const year = new Date().getFullYear();
    const cardNumber = `CARD-${employee.employeeId}-${year}-${Date.now()}`;

    // Set expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create new card
    const newCard = new this.constructor({
        employee: this.employee,
        department: this.department,
        school: this.school,
        position: this.position,
        cardType: this.cardType,
        cardNumber: cardNumber,
        'expiry.expiryDate': expiryDate,
        issue: {
            issuedBy,
            issueReason: 'replacement'
        },
        template: this.template,
        previousCard: this._id,
        replacement: {
            originalCard: this._id,
            replacementReason: reason
        }
    });

    // Link replacement
    this.replacement.replacedBy = newCard._id;
    this.replacement.replacementDate = new Date();
    this.replacement.replacementReason = reason;

    await this.save();
    await newCard.save();

    return newCard;
};

/**
 * Instance method to renew card
 * 
 * @param {ObjectId} issuedBy - User issuing renewal
 * @returns {Promise<IDCard>} Renewed card (this instance)
 */
idCardSchema.methods.renewCard = async function (issuedBy) {
    const newExpiryDate = new Date();
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

    this.expiry.expiryDate = newExpiryDate;
    this.expiry.renewalNoticeSent = false;
    this.status = 'active';
    this.isActive = true;

    this.printHistory.push({
        printedBy: issuedBy,
        printType: 'individual',
        printReason: 'renewal',
        printStatus: 'success'
    });

    return await this.save();
};

/**
 * Static method to get employee's current active card
 * 
 * @param {ObjectId} employeeId - Employee ID
 * @returns {Promise<IDCard>} Active card or null
 */
idCardSchema.statics.getEmployeeCard = function (employeeId) {
    return this.findOne({
        employee: employeeId,
        status: 'active',
        isActive: true
    })
        .populate('employee', 'profile employeeId email')
        .populate('department', 'name code')
        .populate('school', 'name schoolCode')
        .populate('position', 'title')
        .populate('issue.issuedBy', 'profile.firstName profile.lastName');
};

/**
 * Static method to get cards needing renewal
 * 
 * @param {Number} daysThreshold - Days until expiry (default: 30)
 * @returns {Promise<IDCard[]>} Cards needing renewal
 */
idCardSchema.statics.getCardsNeedingRenewal = function (daysThreshold = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return this.find({
        status: 'active',
        isActive: true,
        'expiry.expiryDate': { $lte: thresholdDate, $gte: new Date() },
        'expiry.renewalNoticeSent': false
    })
        .populate('employee', 'profile employeeId email')
        .populate('department', 'name code')
        .sort({ 'expiry.expiryDate': 1 });
};

/**
 * Static method to get expired cards
 * 
 * @returns {Promise<IDCard[]>} Expired cards
 */
idCardSchema.statics.getExpiredCards = function () {
    return this.find({
        'expiry.expiryDate': { $lt: new Date() },
        status: { $ne: 'expired' },
        isActive: true
    })
        .populate('employee', 'profile employeeId email')
        .populate('department', 'name code');
};

/**
 * Static method to get cards by department
 * 
 * @param {ObjectId} departmentId - Department ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<IDCard[]>} Department cards
 */
idCardSchema.statics.getDepartmentCards = function (departmentId, filters = {}) {
    const query = {
        department: departmentId,
        ...filters
    };

    return this.find(query)
        .populate('employee', 'profile employeeId email')
        .populate('position', 'title')
        .populate('issue.issuedBy', 'profile.firstName profile.lastName')
        .sort({ 'issue.issuedDate': -1 });
};

/**
 * Static method to get print statistics
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {ObjectId} departmentId - Department filter (optional)
 * @returns {Promise<Object>} Print statistics
 */
idCardSchema.statics.getPrintStatistics = async function (startDate, endDate, departmentId = null) {
    const matchStage = {
        'printHistory.printedAt': {
            $gte: startDate,
            $lte: endDate
        }
    };

    if (departmentId) {
        matchStage.department = new mongoose.Types.ObjectId(departmentId);
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        { $unwind: '$printHistory' },
        {
            $match: {
                'printHistory.printedAt': {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: {
                    printType: '$printHistory.printType',
                    status: '$printHistory.printStatus'
                },
                count: { $sum: 1 },
                uniqueCards: { $addToSet: '$_id' }
            }
        },
        {
            $group: {
                _id: '$_id.printType',
                statuses: {
                    $push: {
                        status: '$_id.status',
                        count: '$count',
                        uniqueCards: { $size: '$uniqueCards' }
                    }
                },
                totalPrints: { $sum: '$count' }
            }
        }
    ]);

    return stats;
};

/**
 * Static method to get card statistics overview
 * 
 * @param {ObjectId} departmentId - Department filter (optional)
 * @returns {Promise<Object>} Card statistics
 */
idCardSchema.statics.getCardStatistics = async function (departmentId = null) {
    const query = departmentId ? { department: departmentId } : {};

    const totalCards = await this.countDocuments(query);
    const activeCards = await this.countDocuments({ ...query, status: 'active' });
    const expiredCards = await this.countDocuments({
        ...query,
        'expiry.expiryDate': { $lt: new Date() }
    });

    const needingRenewal = await this.countDocuments({
        ...query,
        status: 'active',
        'expiry.expiryDate': {
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            $gte: new Date()
        }
    });

    const lostOrStolen = await this.countDocuments({
        ...query,
        status: { $in: ['lost', 'stolen'] }
    });

    const byType = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$cardType',
                count: { $sum: 1 }
            }
        }
    ]);

    return {
        total: totalCards,
        active: activeCards,
        expired: expiredCards,
        needingRenewal,
        lostOrStolen,
        byType
    };
};

// Compound indexes for better performance
idCardSchema.index({ employee: 1, status: 1 });
idCardSchema.index({ employee: 1, isActive: 1 });
idCardSchema.index({ department: 1, status: 1 });
idCardSchema.index({ department: 1, isActive: 1 });
idCardSchema.index({ school: 1, status: 1 });
idCardSchema.index({ 'expiry.expiryDate': 1, status: 1 });
idCardSchema.index({ 'issue.issuedDate': 1 });
idCardSchema.index({ 'printHistory.printedAt': 1 });
idCardSchema.index({ 'printHistory.printedBy': 1 });
idCardSchema.index({ cardType: 1, status: 1 });

export default mongoose.model('IDCard', idCardSchema);
