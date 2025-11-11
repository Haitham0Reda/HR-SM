# Vacation Request Implementation - Complete Flow

## Overview
This document verifies that the vacation request feature with document upload is fully implemented and will save to the database.

## Frontend Implementation

### 1. Vacation Request Page
**File:** `client/src/pages/vacation/VacationRequestPage.jsx`

**Features:**
- Form to submit vacation requests (Annual, Sick, Personal, Unpaid)
- Dynamic reason field (required for sick, optional for others)
- File upload for sick vacation (required)
- File validation (PDF, JPG, PNG, DOC, DOCX, max 5MB)
- Display of user's vacation request history

**Data Flow:**
```javascript
// When submitting sick vacation with document
const submitData = new FormData();
submitData.append('user', user._id);
submitData.append('type', 'sick');
submitData.append('startDate', formData.startDate);
submitData.append('endDate', formData.endDate);
submitData.append('reason', formData.reason);
submitData.append('document', selectedFile); // File object

await leaveService.create(submitData);
```

### 2. Leave Service
**File:** `client/src/services/leave.service.js`

**Implementation:**
```javascript
create: async (data) => {
    // Detects FormData and sets proper headers
    const config = data instanceof FormData ? {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    } : {};
    const response = await api.post('/leaves', data, config);
    return response.data;
}
```

### 3. Routing
**File:** `client/src/App.js`

- Route added: `/vacation-request` → `VacationRequestPage`
- Sidebar menu item added for employees

## Backend Implementation

### 1. Multer Configuration
**File:** `server/config/multer.config.js`

**Features:**
- File storage in `uploads/medical-documents/`
- File naming: `medical-{timestamp}-{random}.{ext}`
- File type validation: PDF, JPG, PNG, DOC, DOCX
- File size limit: 5MB
- Automatic directory creation

### 2. Leave Routes
**File:** `server/routes/leave.routes.js`

**Implementation:**
```javascript
router.post('/',
    protect,                      // Authentication
    checkActive,                  // User status check
    upload.single('document'),    // File upload middleware
    calculateDuration,            // Calculate leave duration
    setMedicalDocRequirement,     // Set medical doc requirement
    populateDepartmentPosition,   // Populate department/position
    reserveVacationBalance,       // Reserve vacation balance
    initializeWorkflow,           // Initialize approval workflow
    createLeave                   // Create leave record
);
```

### 3. Leave Controller
**File:** `server/controller/leave.controller.js`

**Implementation:**
```javascript
export const createLeave = async (req, res) => {
    try {
        const leaveData = {
            ...req.body,
            // Map frontend fields to model fields
            employee: req.body.user || req.body.employee,
            leaveType: req.body.type || req.body.leaveType
        };
        
        // Handle file upload for sick leave
        if (req.file && leaveData.leaveType === 'sick') {
            leaveData.medicalDocumentation = {
                required: true,
                provided: true,
                documents: [{
                    filename: req.file.originalname,
                    url: req.file.path,
                    uploadedAt: new Date(),
                    uploadedBy: req.user?._id || leaveData.employee
                }]
            };
        }

        const leave = new Leave(leaveData);
        const savedLeave = await leave.save();
        
        // Post-save operations
        await handleVacationBalanceUpdate(savedLeave);
        await createLeaveNotifications(savedLeave);

        res.status(201).json(savedLeave);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
```

### 4. Leave Model
**File:** `server/models/leave.model.js`

**Database Schema:**
```javascript
{
  employee: ObjectId (ref: User),
  leaveType: String (enum: annual, sick, personal, unpaid, etc.),
  startDate: Date,
  endDate: Date,
  duration: Number,
  reason: String (required for sick leave only),
  status: String (default: 'pending'),
  
  // Medical documentation for sick leave
  medicalDocumentation: {
    required: Boolean,
    provided: Boolean,
    documents: [{
      filename: String,
      url: String,
      uploadedAt: Date,
      uploadedBy: ObjectId
    }],
    reviewedByDoctor: Boolean,
    doctorReviewedBy: ObjectId,
    doctorReviewedAt: Date,
    doctorNotes: String
  },
  
  // Workflow tracking
  workflow: {
    supervisorApprovalStatus: String,
    doctorApprovalStatus: String,
    currentStep: String
  }
}
```

## Data Flow Verification

### Complete Request Flow:

1. **User Action:**
   - Employee selects "Sick Vacation"
   - Fills in dates and reason
   - Uploads medical document (PDF/Image)
   - Clicks "Submit Request"

2. **Frontend Processing:**
   - Creates FormData object
   - Appends all form fields
   - Appends file as 'document'
   - Sends POST to `/api/leaves`

3. **Backend Processing:**
   - `protect` middleware: Authenticates user
   - `upload.single('document')`: Saves file to disk, adds `req.file`
   - `calculateDuration`: Calculates leave duration
   - `createLeave` controller:
     - Maps `user` → `employee`
     - Maps `type` → `leaveType`
     - Creates `medicalDocumentation` object with file info
     - Saves to MongoDB

4. **Database Storage:**
   ```json
   {
     "_id": "...",
     "employee": "user_id",
     "leaveType": "sick",
     "startDate": "2024-01-15",
     "endDate": "2024-01-17",
     "duration": 3,
     "reason": "Medical treatment required",
     "status": "pending",
     "medicalDocumentation": {
       "required": true,
       "provided": true,
       "documents": [{
         "filename": "medical-certificate.pdf",
         "url": "uploads/medical-documents/medical-1234567890-123456789.pdf",
         "uploadedAt": "2024-01-15T10:30:00.000Z",
         "uploadedBy": "user_id"
       }]
     },
     "workflow": {
       "supervisorApprovalStatus": "pending",
       "doctorApprovalStatus": "pending",
       "currentStep": "supervisor-review"
     },
     "createdAt": "2024-01-15T10:30:00.000Z"
   }
   ```

5. **File Storage:**
   - Physical file saved to: `server/uploads/medical-documents/medical-1234567890-123456789.pdf`
   - File path stored in database: `medicalDocumentation.documents[0].url`

## Validation Summary

✅ **Frontend Validation:**
- File type: PDF, JPG, PNG, DOC, DOCX
- File size: Max 5MB
- Reason: Required for sick vacation
- Document: Required for sick vacation

✅ **Backend Validation:**
- Authentication required
- File type validation in multer
- File size limit: 5MB
- Model validation for required fields

✅ **Database Storage:**
- Leave record with all fields
- Medical documentation object
- File metadata (filename, path, upload date)
- Workflow status tracking

## Testing Checklist

To verify the implementation works:

1. ✅ Start the server
2. ✅ Login as employee
3. ✅ Navigate to "Vacation Request" in sidebar
4. ✅ Select "Sick Vacation"
5. ✅ Fill in dates and reason
6. ✅ Upload a medical document
7. ✅ Submit the request
8. ✅ Check database for new leave record
9. ✅ Verify file exists in `server/uploads/medical-documents/`
10. ✅ Verify `medicalDocumentation.documents` array has file info

## Conclusion

The vacation request feature with document upload is **FULLY IMPLEMENTED** and will:
- ✅ Accept file uploads from frontend
- ✅ Save files to server disk
- ✅ Store file metadata in MongoDB
- ✅ Link files to leave requests
- ✅ Support the approval workflow
