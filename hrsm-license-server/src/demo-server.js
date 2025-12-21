#!/usr/bin/env node
/**
 * Demo License Server - Runs without MongoDB for demonstration
 * This version shows the license server functionality without requiring database connection
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'license-server-demo' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5000,http://localhost:3001').split(',');
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Load RSA keys (if available)
let privateKey = null;
let publicKey = null;

try {
  const privateKeyPath = path.resolve(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem');
  const publicKeyPath = path.resolve(process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem');
  
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  
  logger.info('✅ RSA keys loaded successfully');
} catch (error) {
  logger.warn('⚠️ RSA keys not found, using demo mode');
}

// Mock license data for demo
const mockLicenses = new Map();

// Initialize some demo licenses
mockLicenses.set('HRSM-DEMO-001', {
  licenseNumber: 'HRSM-DEMO-001',
  tenantId: 'demo-tenant-1',
  tenantName: 'Demo Company 1',
  type: 'professional',
  features: ['hr-core', 'life-insurance', 'reports'],
  maxUsers: 100,
  maxStorage: 10240,
  maxAPI: 100000,
  status: 'active',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  createdAt: new Date()
});

mockLicenses.set('HRSM-DEMO-002', {
  licenseNumber: 'HRSM-DEMO-002',
  tenantId: 'demo-tenant-2',
  tenantName: 'Demo Company 2',
  type: 'basic',
  features: ['hr-core'],
  maxUsers: 50,
  maxStorage: 5120,
  maxAPI: 50000,
  status: 'active',
  expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
  createdAt: new Date()
});

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY || 'hrsm-admin-key-2024-secure-change-in-production';
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_API_KEY',
      message: 'Valid API key required'
    });
  }
  
  next();
};

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    service: 'HR-SM License Server (Demo Mode)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: 'demo-mode',
    rsaKeys: privateKey ? 'loaded' : 'demo-mode'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HR-SM License Server (Demo Mode)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'operational',
    endpoints: {
      health: '/health',
      validate: 'POST /licenses/validate',
      create: 'POST /licenses/create',
      list: 'GET /licenses'
    }
  });
});

// List licenses (demo)
app.get('/licenses', authenticateApiKey, (req, res) => {
  const licenses = Array.from(mockLicenses.values()).map(license => ({
    licenseNumber: license.licenseNumber,
    tenantName: license.tenantName,
    type: license.type,
    status: license.status,
    expiresAt: license.expiresAt,
    features: license.features
  }));
  
  res.json({
    success: true,
    data: licenses,
    count: licenses.length
  });
});

// Create license (demo)
app.post('/licenses/create', authenticateApiKey, (req, res) => {
  try {
    const { tenantId, tenantName, type, features, maxUsers, expiresAt } = req.body;
    
    if (!tenantId || !tenantName || !type) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'tenantId, tenantName, and type are required'
      });
    }
    
    // Generate demo license number
    const timestamp = Date.now().toString(16).toUpperCase();
    const random = Math.random().toString(16).substr(2, 4).toUpperCase();
    const licenseNumber = `HRSM-${timestamp}-${random}`;
    
    const license = {
      licenseNumber,
      tenantId,
      tenantName,
      type,
      features: features || ['hr-core'],
      maxUsers: maxUsers || 50,
      maxStorage: 5120,
      maxAPI: 50000,
      status: 'active',
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    };
    
    mockLicenses.set(licenseNumber, license);
    
    // Generate demo JWT token
    let token = null;
    if (privateKey) {
      const payload = {
        ln: licenseNumber,
        tid: tenantId,
        type: type,
        features: license.features,
        maxUsers: license.maxUsers,
        exp: Math.floor(license.expiresAt.getTime() / 1000)
      };
      
      token = jwt.sign(payload, privateKey, { 
        algorithm: 'RS256',
        issuer: 'HRSM-License-Server-Demo',
        subject: tenantId
      });
    } else {
      token = `demo-token-${licenseNumber}`;
    }
    
    logger.info('License created', { licenseNumber, tenantId, tenantName });
    
    res.status(201).json({
      success: true,
      data: {
        licenseNumber,
        token,
        expiresAt: license.expiresAt,
        features: license.features
      }
    });
    
  } catch (error) {
    logger.error('License creation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'LICENSE_CREATION_FAILED',
      message: error.message
    });
  }
});

// Validate license
app.post('/licenses/validate', (req, res) => {
  try {
    const { token, machineId } = req.body;
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'MISSING_TOKEN',
        message: 'License token is required'
      });
    }
    
    // Try to decode JWT token if we have public key
    if (publicKey && !token.startsWith('demo-token-')) {
      try {
        const decoded = jwt.verify(token, publicKey, { 
          algorithms: ['RS256'],
          issuer: 'HRSM-License-Server-Demo'
        });
        
        // Check if license exists in our mock data
        const license = mockLicenses.get(decoded.ln);
        if (!license) {
          return res.json({
            valid: false,
            error: 'LICENSE_NOT_FOUND',
            message: 'License not found'
          });
        }
        
        // Check expiry
        if (new Date() > license.expiresAt) {
          return res.json({
            valid: false,
            error: 'LICENSE_EXPIRED',
            message: 'License has expired'
          });
        }
        
        logger.info('License validation successful', { 
          licenseNumber: decoded.ln, 
          tenantId: decoded.tid 
        });
        
        return res.json({
          valid: true,
          licenseNumber: decoded.ln,
          tenantId: decoded.tid,
          licenseType: decoded.type,
          features: decoded.features,
          maxUsers: decoded.maxUsers,
          expiresAt: license.expiresAt.toISOString()
        });
        
      } catch (jwtError) {
        logger.warn('JWT validation failed', { error: jwtError.message });
        return res.json({
          valid: false,
          error: 'INVALID_TOKEN',
          message: 'Invalid or malformed token'
        });
      }
    }
    
    // Demo mode validation for demo tokens
    if (token.startsWith('demo-token-')) {
      const licenseNumber = token.replace('demo-token-', '');
      const license = mockLicenses.get(licenseNumber);
      
      if (!license) {
        return res.json({
          valid: false,
          error: 'LICENSE_NOT_FOUND',
          message: 'Demo license not found'
        });
      }
      
      if (new Date() > license.expiresAt) {
        return res.json({
          valid: false,
          error: 'LICENSE_EXPIRED',
          message: 'Demo license has expired'
        });
      }
      
      logger.info('Demo license validation successful', { 
        licenseNumber, 
        tenantId: license.tenantId 
      });
      
      return res.json({
        valid: true,
        licenseNumber: license.licenseNumber,
        tenantId: license.tenantId,
        licenseType: license.type,
        features: license.features,
        maxUsers: license.maxUsers,
        expiresAt: license.expiresAt.toISOString(),
        mode: 'demo'
      });
    }
    
    // Unknown token format
    return res.json({
      valid: false,
      error: 'INVALID_TOKEN_FORMAT',
      message: 'Unrecognized token format'
    });
    
  } catch (error) {
    logger.error('License validation error', { error: error.message });
    res.status(500).json({
      valid: false,
      error: 'VALIDATION_ERROR',
      message: 'Internal validation error'
    });
  }
});

// Get license details
app.get('/licenses/:licenseNumber', authenticateApiKey, (req, res) => {
  const { licenseNumber } = req.params;
  const license = mockLicenses.get(licenseNumber);
  
  if (!license) {
    return res.status(404).json({
      success: false,
      error: 'LICENSE_NOT_FOUND',
      message: 'License not found'
    });
  }
  
  res.json({
    success: true,
    data: license
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'ENDPOINT_NOT_FOUND',
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    error: error.message, 
    stack: error.stack,
    path: req.path 
  });
  
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An internal server error occurred'
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 License Server (Demo Mode) running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔐 RSA Keys: ${privateKey ? 'Loaded' : 'Demo Mode'}`);
  logger.info(`📝 Demo licenses: ${mockLicenses.size} available`);
  logger.info(`🌐 Access: http://localhost:${PORT}`);
  
  // Log demo license info
  console.log('\n📋 Demo Licenses Available:');
  for (const [licenseNumber, license] of mockLicenses) {
    console.log(`   ${licenseNumber} - ${license.tenantName} (${license.type})`);
  }
  console.log('');
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;