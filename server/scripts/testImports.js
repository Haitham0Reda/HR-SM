try {
    console.log('Testing platform logger import...');
    const platformLogger = await import('../utils/platformLogger.js');
    console.log('Platform logger imported successfully');
    console.log('Available exports:', Object.keys(platformLogger));
    
    console.log('Testing platform security monitoring import...');
    const psm = await import('../services/platformSecurityMonitoring.service.js');
    console.log('Platform security monitoring imported successfully');
    console.log('Available exports:', Object.keys(psm));
    console.log('Default export:', psm.default);
} catch (error) {
    console.error('Import error:', error.message);
}