import express from 'express';
import { requireAuth, requireRole } from '../../../shared/middleware/auth.js';
import { requireModule } from '../../../shared/middleware/moduleGuard.js';
import { MODULES, ROLES } from '../../../shared/constants/modules.js';
import {
  // Medical Profiles
  createMedicalProfile,
  getMedicalProfiles,
  getMedicalProfile,
  getMedicalProfileByUser,
  updateMedicalProfile,
  deleteMedicalProfile,
  
  // Visits
  createVisit,
  getVisits,
  getVisit,
  updateVisit,
  deleteVisit,
  
  // Appointments
  createAppointment,
  getAppointments,
  
  // Prescriptions
  createPrescription,
  getPrescriptions,
  getPrescription,
  updatePrescription,
  deletePrescription,
  
  // Medical Leave Requests
  createMedicalLeaveRequest,
  getMedicalLeaveRequests,
  getMedicalLeaveRequest
} from '../controllers/clinicController.js';

const router = express.Router();

// All routes require authentication and clinic module to be enabled
router.use(requireAuth);
router.use(requireModule(MODULES.CLINIC || 'clinic'));

// ==================== Medical Profiles ====================
// Medical staff can manage all profiles, users can view their own
router.post('/medical-profiles', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  createMedicalProfile
);

router.get('/medical-profiles', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  getMedicalProfiles
);

router.get('/medical-profiles/user/:userId', 
  getMedicalProfileByUser
);

router.get('/medical-profiles/:id', 
  getMedicalProfile
);

router.put('/medical-profiles/:id', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  updateMedicalProfile
);

router.delete('/medical-profiles/:id', 
  requireRole(ROLES.ADMIN), 
  deleteMedicalProfile
);

// ==================== Visits ====================
// Medical staff can manage visits
router.post('/visits', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  createVisit
);

router.get('/visits', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  getVisits
);

router.get('/visits/:id', 
  getVisit
);

router.put('/visits/:id', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  updateVisit
);

router.delete('/visits/:id', 
  requireRole(ROLES.ADMIN), 
  deleteVisit
);

// ==================== Appointments ====================
// Users can create their own appointments, medical staff can manage all
router.post('/appointments', 
  createAppointment
);

router.get('/appointments', 
  getAppointments
);

// ==================== Prescriptions ====================
// Medical staff can create and manage prescriptions
router.post('/prescriptions', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  createPrescription
);

router.get('/prescriptions', 
  getPrescriptions
);

router.get('/prescriptions/:id', 
  getPrescription
);

router.put('/prescriptions/:id', 
  requireRole(ROLES.ADMIN, ROLES.HR, 'medical-staff'), 
  updatePrescription
);

router.delete('/prescriptions/:id', 
  requireRole(ROLES.ADMIN), 
  deletePrescription
);

// ==================== Medical Leave Requests ====================
/**
 * 🚨 CRITICAL: These endpoints create requests via HR-Core
 * They do NOT directly modify attendance or vacation balances
 */
router.post('/medical-leave-request', 
  createMedicalLeaveRequest
);

router.get('/medical-leave-requests', 
  getMedicalLeaveRequests
);

router.get('/medical-leave-requests/:id', 
  getMedicalLeaveRequest
);

export default router;
