# Clinic Module

## Overview

The Clinic Module provides medical clinic management functionality for organizations with on-site medical facilities. This module manages medical profiles, visits, appointments, and prescriptions.

## 🚨 CRITICAL RULE: Clinic Can Only REQUEST Changes

**The Clinic module CANNOT directly modify HR-Core data.**

This means:
- ❌ Clinic CANNOT directly modify attendance records
- ❌ Clinic CANNOT directly modify vacation balances
- ❌ Clinic CANNOT directly modify overtime records
- ❌ Clinic CANNOT directly modify any employment data

Instead:
- ✅ Clinic creates medical leave REQUESTS via HR-Core Requests API
- ✅ HR-Core approves/rejects the request
- ✅ HR-Core updates vacation balances and attendance
- ✅ Clinic only reads request status

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLINIC MODULE                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Medical    │  │    Visits    │  │Appointments  │ │
│  │   Profiles   │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │Prescriptions │  │ Medical Leave Request Service│   │
│  │              │  │  (Calls HR-Core Requests)    │   │
│  └──────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼ (REQUEST only)
┌─────────────────────────────────────────────────────────┐
│                      HR-CORE                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Generic Request System                    │  │
│  │  - Receives medical-leave requests from Clinic   │  │
│  │  - Approves/Rejects based on business rules      │  │
│  │  - Updates vacation balances                      │  │
│  │  - Updates attendance records                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Features

### Medical Profiles
- Patient information (blood type, allergies, medical conditions)
- Emergency contacts
- Medical history
- Insurance information

### Visits
- Visit records with date, doctor, diagnosis, notes
- Treatment plans
- Follow-up scheduling
- Visit history

### Appointments
- Schedule medical appointments
- Appointment reminders (via Email Service if enabled)
- Appointment status tracking
- Calendar integration

### Prescriptions
- Medication prescriptions
- Dosage and duration
- Refill tracking
- Prescription history

### Medical Leave Requests
- Create medical leave requests via HR-Core
- Attach medical documentation
- Track request status
- View approval history

## Dependencies

### Required Dependencies
- **hr-core**: Required for user data and request system

### Optional Dependencies
- **email-service**: For appointment reminders and prescription notifications

## Integration with HR-Core

### Medical Leave Request Flow

1. **Clinic creates request**:
   ```javascript
   POST /api/v1/clinic/medical-leave-request
   {
     userId: 'user_123',
     startDate: '2025-12-10',
     endDate: '2025-12-15',
     diagnosis: 'Flu',
     medicalDocumentation: 'doc_ref_456'
   }
   ```

2. **Clinic calls HR-Core Requests API**:
   ```javascript
   POST /api/v1/hr-core/requests
   {
     requestType: 'medical-leave',
     requestedBy: 'user_123',
     requestData: {
       startDate: '2025-12-10',
       endDate: '2025-12-15',
       diagnosis: 'Flu',
       medicalDocumentation: 'doc_ref_456'
     }
   }
   ```

3. **HR-Core processes request**:
   - Validates request data
   - Checks vacation balance
   - Creates request with status 'pending'
   - Returns request ID to Clinic

4. **HR Manager approves/rejects**:
   ```javascript
   POST /api/v1/hr-core/requests/:id/approve
   ```

5. **HR-Core updates data**:
   - Deducts from vacation balance
   - Marks attendance as medical leave
   - Updates request status to 'approved'

6. **Clinic reads status**:
   ```javascript
   GET /api/v1/hr-core/requests/:id
   ```

## API Endpoints

### Medical Profiles
- `POST /api/v1/clinic/medical-profiles` - Create medical profile
- `GET /api/v1/clinic/medical-profiles` - Get all medical profiles
- `GET /api/v1/clinic/medical-profiles/:id` - Get medical profile by ID
- `PUT /api/v1/clinic/medical-profiles/:id` - Update medical profile
- `DELETE /api/v1/clinic/medical-profiles/:id` - Delete medical profile

### Visits
- `POST /api/v1/clinic/visits` - Create visit record
- `GET /api/v1/clinic/visits` - Get all visits
- `GET /api/v1/clinic/visits/:id` - Get visit by ID
- `PUT /api/v1/clinic/visits/:id` - Update visit
- `DELETE /api/v1/clinic/visits/:id` - Delete visit

### Appointments
- `POST /api/v1/clinic/appointments` - Schedule appointment
- `GET /api/v1/clinic/appointments` - Get all appointments
- `GET /api/v1/clinic/appointments/:id` - Get appointment by ID
- `PUT /api/v1/clinic/appointments/:id` - Update appointment
- `DELETE /api/v1/clinic/appointments/:id` - Cancel appointment

### Prescriptions
- `POST /api/v1/clinic/prescriptions` - Create prescription
- `GET /api/v1/clinic/prescriptions` - Get all prescriptions
- `GET /api/v1/clinic/prescriptions/:id` - Get prescription by ID
- `PUT /api/v1/clinic/prescriptions/:id` - Update prescription
- `DELETE /api/v1/clinic/prescriptions/:id` - Delete prescription

### Medical Leave Requests
- `POST /api/v1/clinic/medical-leave-request` - Create medical leave request (calls HR-Core)
- `GET /api/v1/clinic/medical-leave-requests` - Get medical leave requests
- `GET /api/v1/clinic/medical-leave-requests/:id` - Get request status

## Configuration

```javascript
{
  emailNotifications: true,
  appointmentReminderHours: 24,
  prescriptionRefillDays: 7,
  requireMedicalDocumentation: true
}
```

## Pricing

- **Tier**: Enterprise
- **Monthly Price**: $49.99
- **Yearly Price**: $499.99
- **Description**: Includes medical profiles, visits, appointments, prescriptions, and medical leave integration

## Installation

The Clinic module can be enabled/disabled per tenant through the Platform Admin dashboard.

## Removal

The Clinic module can be safely removed without affecting HR-Core functionality. All clinic data is preserved in the database for potential re-enablement.

## Security

- All data is tenant-scoped with tenantId field
- Medical data is sensitive and requires appropriate access controls
- Only authorized medical staff can access medical profiles
- Patients can view their own medical records

## Compliance

- HIPAA compliance considerations for medical data
- Data encryption at rest and in transit
- Audit logging for all medical record access
- Data retention policies

