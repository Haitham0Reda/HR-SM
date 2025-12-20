import { asyncHandler } from './errorHandler.js';

export const authenticatePlatformAdmin = asyncHandler(async (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No API key provided.'
    });
  }

  const validApiKey = process.env.ADMIN_API_KEY;
  
  if (!validApiKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error. Admin API key not configured.'
    });
  }

  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Invalid API key.'
    });
  }

  // Add admin info to request
  req.admin = {
    id: 'platform-admin',
    role: 'admin',
    permissions: ['create_license', 'revoke_license', 'view_licenses']
  };

  next();
});

export const authenticateHRSMBackend = asyncHandler(async (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.header('Authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No API key provided.'
    });
  }

  // For now, use the same API key for HRSM backend
  // In production, you might want separate keys
  const validApiKey = process.env.ADMIN_API_KEY;
  
  if (!validApiKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error. API key not configured.'
    });
  }

  if (apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Invalid API key.'
    });
  }

  // Add backend info to request
  req.backend = {
    id: 'hrsm-backend',
    role: 'backend',
    permissions: ['validate_license', 'update_usage']
  };

  next();
});