/**
 * Forget Check Test Data Utilities
 * 
 * Helper functions and sample data for testing forget check functionality
 */

// Sample forget check requests for testing
export const sampleForgetCheckRequests = [
    {
        requestType: 'check-in',
        requestedTime: '08:30',
        reason: 'System was down when I arrived at the office. The card reader and mobile app were both experiencing technical difficulties during my arrival time.',
        date: new Date().toISOString().split('T')[0] // Today
    },
    {
        requestType: 'check-out',
        requestedTime: '17:45',
        reason: 'Left for urgent doctor appointment, forgot to check out. Had to leave immediately for a medical emergency and forgot to complete the check-out procedure.',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Yesterday
    },
    {
        requestType: 'check-in',
        requestedTime: '09:15',
        reason: 'Had to rush to emergency meeting with client, forgot to check in. Manager called for urgent issue resolution meeting immediately upon my arrival.',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days ago
    },
    {
        requestType: 'check-out',
        requestedTime: '18:30',
        reason: 'Forgot to check out after working late on project. Was working on critical project deliverable and lost track of time, left without checking out.',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 days ago
    },
    {
        requestType: 'check-in',
        requestedTime: '07:45',
        reason: 'Arrived early for project deadline, forgot to check in. Was focused on preparing for important presentation and overlooked the check-in procedure.',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 4 days ago
    }
];

// Common reasons for check-in forget requests
export const checkInReasons = [
    'System was down when I arrived at the office',
    'Card reader was not working at main entrance',
    'Had to rush to emergency meeting, forgot to check in',
    'Network issues prevented mobile check-in',
    'Arrived early for project deadline, forgot to check in',
    'Had to attend to family emergency, forgot check-in procedure',
    'Was helping colleague with urgent task, missed check-in',
    'Attended early morning training session, forgot to check in',
    'Had to take important client call immediately upon arrival',
    'Power outage affected check-in system'
];

// Common reasons for check-out forget requests
export const checkOutReasons = [
    'Left for urgent doctor appointment, forgot to check out',
    'System maintenance was ongoing during my departure time',
    'Had to leave immediately for family emergency',
    'Forgot to check out after working late on project',
    'Card reader malfunction at exit gate',
    'Left with manager for client meeting, forgot check-out',
    'Power outage affected check-out system',
    'Had to rush to catch last bus, forgot to check out',
    'Attended off-site meeting, forgot to check out first',
    'Left early due to illness, forgot check-out procedure'
];

// Generate random forget check request
export const generateRandomForgetCheck = () => {
    const requestTypes = ['check-in', 'check-out'];
    const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)];
    
    // Generate realistic times
    let requestedTime;
    if (requestType === 'check-in') {
        // Check-in times between 7:00 AM and 10:00 AM
        const hour = Math.floor(Math.random() * 3) + 7; // 7-9
        const minute = Math.floor(Math.random() * 60);
        requestedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    } else {
        // Check-out times between 4:00 PM and 8:00 PM
        const hour = Math.floor(Math.random() * 4) + 16; // 16-19
        const minute = Math.floor(Math.random() * 60);
        requestedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
    
    // Select appropriate reason
    const reasons = requestType === 'check-in' ? checkInReasons : checkOutReasons;
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    
    // Generate date within last 7 days
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    return {
        requestType,
        requestedTime,
        reason,
        date: date.toISOString().split('T')[0]
    };
};

// Validate forget check form data
export const validateForgetCheckData = (formData) => {
    const errors = {};
    
    // Validate date
    if (!formData.date) {
        errors.date = 'Date is required';
    } else {
        const selectedDate = new Date(formData.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        if (selectedDate > today) {
            errors.date = 'Date cannot be in the future';
        }
        
        // Check if date is more than 7 days ago
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (selectedDate < sevenDaysAgo) {
            errors.date = 'Date cannot be more than 7 days ago';
        }
    }
    
    // Validate request type
    if (!formData.requestType) {
        errors.requestType = 'Request type is required';
    } else if (!['check-in', 'check-out'].includes(formData.requestType)) {
        errors.requestType = 'Invalid request type';
    }
    
    // Validate requested time
    if (!formData.requestedTime) {
        errors.requestedTime = 'Requested time is required';
    } else {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(formData.requestedTime)) {
            errors.requestedTime = 'Time must be in HH:MM format';
        }
    }
    
    // Validate reason
    if (!formData.reason) {
        errors.reason = 'Reason is required';
    } else {
        const trimmedReason = formData.reason.trim();
        if (trimmedReason.length < 10) {
            errors.reason = 'Reason must be at least 10 characters long';
        } else if (trimmedReason.length > 500) {
            errors.reason = 'Reason cannot exceed 500 characters';
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// Format forget check data for display
export const formatForgetCheckForDisplay = (forgetCheck) => {
    return {
        ...forgetCheck,
        formattedDate: new Date(forgetCheck.date).toLocaleDateString(),
        formattedTime: forgetCheck.requestedTime,
        statusColor: getStatusColor(forgetCheck.status),
        typeIcon: forgetCheck.requestType === 'check-in' ? '🔓' : '🔒',
        shortReason: forgetCheck.reason.length > 50 
            ? forgetCheck.reason.substring(0, 50) + '...' 
            : forgetCheck.reason
    };
};

// Get status color for UI display
export const getStatusColor = (status) => {
    const colors = {
        pending: 'warning',
        approved: 'success',
        rejected: 'error'
    };
    return colors[status] || 'default';
};

// Get status icon for UI display
export const getStatusIcon = (status) => {
    const icons = {
        pending: '⏳',
        approved: '✅',
        rejected: '❌'
    };
    return icons[status] || '❓';
};

// Test data for different scenarios
export const testScenarios = {
    // Valid requests
    validCheckIn: {
        requestType: 'check-in',
        requestedTime: '08:30',
        reason: 'System was down when I arrived at the office this morning.',
        date: new Date().toISOString().split('T')[0]
    },
    
    validCheckOut: {
        requestType: 'check-out',
        requestedTime: '17:45',
        reason: 'Left for urgent doctor appointment, forgot to check out.',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    
    // Invalid requests for testing validation
    invalidFutureDate: {
        requestType: 'check-in',
        requestedTime: '08:30',
        reason: 'System was down when I arrived at the office.',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
    },
    
    invalidShortReason: {
        requestType: 'check-in',
        requestedTime: '08:30',
        reason: 'Forgot', // Too short
        date: new Date().toISOString().split('T')[0]
    },
    
    invalidTimeFormat: {
        requestType: 'check-in',
        requestedTime: '25:70', // Invalid time
        reason: 'System was down when I arrived at the office.',
        date: new Date().toISOString().split('T')[0]
    }
};

// Helper function to populate form with test data
export const populateFormWithTestData = (setFormData, scenario = 'validCheckIn') => {
    const testData = testScenarios[scenario] || testScenarios.validCheckIn;
    setFormData(testData);
};

// Export all utilities
export default {
    sampleForgetCheckRequests,
    checkInReasons,
    checkOutReasons,
    generateRandomForgetCheck,
    validateForgetCheckData,
    formatForgetCheckForDisplay,
    getStatusColor,
    getStatusIcon,
    testScenarios,
    populateFormWithTestData
};