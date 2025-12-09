import clinicService from '../services/clinicService.js';
import visitService from '../services/visitService.js';
import prescriptionService from '../services/prescriptionService.js';
import medicalLeaveRequestService from '../services/medicalLeaveRequestService.js';

/**
 * Clinic Controller
 * 
 * Handles HTTP requests for clinic module endpoints
 * 
 * CRITICAL: All operations are tenant-scoped
 * CRITICAL: Medical leave requests go through HR-Core
 */

// ==================== Medical Profiles ====================

export const createMedicalProfile = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const profileData = {
      ...req.body,
      tenantId,
      createdBy: req.user.id
    };
    
    const profile = await clinicService.createMedicalProfile(profileData);
    
    res.status(201).json({
      success: true,
      data: profile,
      message: 'Medical profile created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getMedicalProfiles = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };
    
    const profiles = await clinicService.getAllMedicalProfiles(tenantId, options);
    
    res.status(200).json({
      success: true,
      data: profiles
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getMedicalProfile = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    
    const profile = await clinicService.getMedicalProfileById(id, tenantId);
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const getMedicalProfileByUser = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { userId } = req.params;
    
    const profile = await clinicService.getMedicalProfileByUser(userId, tenantId);
    
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const updateMedicalProfile = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    const updatedBy = req.user.id;
    
    const profile = await clinicService.updateMedicalProfile(id, tenantId, req.body, updatedBy);
    
    res.status(200).json({
      success: true,
      data: profile,
      message: 'Medical profile updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteMedicalProfile = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    
    const result = await clinicService.deleteMedicalProfile(id, tenantId);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== Visits ====================

export const createVisit = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const visitData = {
      ...req.body,
      tenantId,
      createdBy: req.user.id
    };
    
    const visit = await visitService.createVisit(visitData);
    
    res.status(201).json({
      success: true,
      data: visit,
      message: 'Visit record created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getVisits = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { patientId, startDate, endDate } = req.query;
    
    let visits;
    if (patientId) {
      visits = await visitService.getVisitsByPatient(patientId, tenantId);
    } else if (startDate && endDate) {
      visits = await visitService.getVisitsByDateRange(tenantId, startDate, endDate);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either patientId or date range (startDate and endDate)'
      });
    }
    
    res.status(200).json({
      success: true,
      data: visits
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getVisit = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    
    const visit = await visitService.getVisitById(id, tenantId);
    
    res.status(200).json({
      success: true,
      data: visit
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const updateVisit = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    const updatedBy = req.user.id;
    
    const visit = await visitService.updateVisit(id, tenantId, req.body, updatedBy);
    
    res.status(200).json({
      success: true,
      data: visit,
      message: 'Visit record updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteVisit = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    
    const result = await visitService.deleteVisit(id, tenantId);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== Appointments ====================

// Appointment endpoints would be implemented here
// For brevity, I'll add a placeholder
export const createAppointment = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Appointment endpoints to be implemented'
  });
};

export const getAppointments = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Appointment endpoints to be implemented'
  });
};

// ==================== Prescriptions ====================

export const createPrescription = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const prescriptionData = {
      ...req.body,
      tenantId,
      createdBy: req.user.id
    };
    
    const prescription = await prescriptionService.createPrescription(prescriptionData);
    
    res.status(201).json({
      success: true,
      data: prescription,
      message: 'Prescription created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getPrescriptions = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { patientId, active } = req.query;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'patientId is required'
      });
    }
    
    let prescriptions;
    if (active === 'true') {
      prescriptions = await prescriptionService.getActivePrescriptionsByPatient(patientId, tenantId);
    } else {
      prescriptions = await prescriptionService.getPrescriptionsByPatient(patientId, tenantId);
    }
    
    res.status(200).json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getPrescription = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    
    const prescription = await prescriptionService.getPrescriptionById(id, tenantId);
    
    res.status(200).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

export const updatePrescription = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    const updatedBy = req.user.id;
    
    const prescription = await prescriptionService.updatePrescription(id, tenantId, req.body, updatedBy);
    
    res.status(200).json({
      success: true,
      data: prescription,
      message: 'Prescription updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const deletePrescription = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const { id } = req.params;
    
    const result = await prescriptionService.deletePrescription(id, tenantId);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== Medical Leave Requests ====================

/**
 * 🚨 CRITICAL: This endpoint creates a request via HR-Core
 * It does NOT directly modify attendance or vacation balances
 */
export const createMedicalLeaveRequest = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const authToken = req.headers.authorization?.split(' ')[1];
    
    const requestData = {
      ...req.body,
      tenantId,
      userId: req.body.userId || req.user.id
    };
    
    // Call HR-Core to create the request
    const result = await medicalLeaveRequestService.createMedicalLeaveRequest(requestData, authToken);
    
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getMedicalLeaveRequests = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const authToken = req.headers.authorization?.split(' ')[1];
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }
    
    const result = await medicalLeaveRequestService.getMedicalLeaveRequestsByUser(userId, tenantId, authToken);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getMedicalLeaveRequest = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user.tenantId;
    const authToken = req.headers.authorization?.split(' ')[1];
    const { id } = req.params;
    
    const result = await medicalLeaveRequestService.getMedicalLeaveRequestStatus(id, tenantId, authToken);
    
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};
