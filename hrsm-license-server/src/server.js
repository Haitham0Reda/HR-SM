#!/usr/bin/env node
/**
 * Standalone License Server - HR-SM Platform
 * Fully independent Express microservice for license management
 * Port: 4000
 * Database: PostgreSQL (separate from main app)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { Sequelize, DataTypes } from 'sequelize';

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
  defaultMeta: { service: 'license-server' },
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// PostgreSQL Database Configuration
const licenseUrl = process.env.LICENSE_DATABASE_URL;
let dbConfig = {};

if (licenseUrl) {
  try {
    const url = new URL(licenseUrl);
    dbConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      dialect: 'postgres',
      pool: {
        max: parseInt(process.env.PG_MAX_POOL_SIZE) || 10,
        min: parseInt(process.env.PG_MIN_POOL_SIZE) || 2,
        acquire: parseInt(process.env.PG_CONNECTION_TIMEOUT) || 30000,
        idle: parseInt(process.env.PG_IDLE_TIMEOUT) || 10000
      },
      logging: process.env.NODE_ENV === 'production' ? false : (msg) => logger.debug(msg)
    };
  } catch (e) {
    logger.warn('Failed to parse LICENSE_DATABASE_URL, falling back to component env vars');
  }
}

// Fallback to individual environment variables
if (!dbConfig.database) {
  dbConfig = {
    database: process.env.LICENSE_DB_NAME || 'hrsm_licenses',
    username: process.env.LICENSE_DB_USER || 'postgres',
    password: process.env.LICENSE_DB_PASSWORD || 'postgres',
    host: process.env.LICENSE_DB_HOST || 'localhost',
    port: parseInt(process.env.LICENSE_DB_PORT || '5432'),
    dialect: 'postgres',
    pool: {
      max: parseInt(process.env.PG_MAX_POOL_SIZE) || 10,
      min: parseInt(process.env.PG_MIN_POOL_SIZE) || 2,
      acquire: parseInt(process.env.PG_CONNECTION_TIMEOUT) || 30000,
      idle: parseInt(process.env.PG_IDLE_TIMEOUT) || 10000
    },
    logging: process.env.NODE_ENV === 'production' ? false : (msg) => logger.debug(msg)
  };
}

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

// Define License Model
const License = sequelize.define('License', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  licenseKey: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  tenantId: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  features: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    index: true
  },
  signature: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'licenses',
  timestamps: true,
  underscored: true
});

// Load RSA Keys
let privateKey, publicKey;

try {
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '../keys/private.pem');
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../keys/public.pem');
  
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  
  logger.info('✅ RSA keys loaded successfully');
} catch (error) {
  logger.error('❌ Failed to load RSA keys:', error.message);
  logger.error('Please generate keys using: npm run generate-keys');
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
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
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ============================================================================
// REST ENDPOINTS
// ============================================================================

/**
 * POST /licenses
 * Generate and store a new RSA-signed JWT license
 * Returns: { licenseKey, expiresAt, features }
 */
app.post('/licenses', async (req, res) => {
  try {
    const { tenantId, features, expiresAt, metadata } = req.body;

    // Validation
    if (!tenantId || !features || !expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId, features, expiresAt'
      });
    }

    // Generate license payload
    const payload = {
      tenantId,
      features,
      expiresAt,
      issuedAt: new Date().toISOString(),
      issuer: 'hrsm-license-server'
    };

    // Sign with RSA private key
    const licenseKey = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: Math.floor((new Date(expiresAt) - Date.now()) / 1000)
    });

    // Store in database
    const license = await License.create({
      licenseKey,
      tenantId,
      features,
      expiresAt: new Date(expiresAt),
      signature: licenseKey.split('.')[2], // Store signature part
      metadata: metadata || {},
      isRevoked: false
    });

    logger.info('License created', {
      licenseId: license.id,
      tenantId,
      expiresAt
    });

    res.status(201).json({
      success: true,
      licenseKey,
      expiresAt: license.expiresAt,
      features: license.features,
      tenantId: license.tenantId
    });

  } catch (error) {
    logger.error('Failed to create license:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create license',
      message: error.message
    });
  }
});

/**
 * GET /licenses/:key/validate
 * Verify signature and expiry
 * Returns: { valid, features, tenantId, expiresAt }
 */
app.get('/licenses/:key/validate', async (req, res) => {
  try {
    const { key } = req.params;

    // Find license in database
    const license = await License.findOne({
      where: { licenseKey: key }
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        valid: false,
        error: 'License not found'
      });
    }

    // Check if revoked
    if (license.isRevoked) {
      return res.json({
        success: true,
        valid: false,
        reason: 'License has been revoked'
      });
    }

    // Verify JWT signature and expiry
    try {
      const decoded = jwt.verify(key, publicKey, {
        algorithms: ['RS256']
      });

      // Check expiry
      const now = new Date();
      const expiresAt = new Date(license.expiresAt);
      const isExpired = now > expiresAt;

      if (isExpired) {
        return res.json({
          success: true,
          valid: false,
          reason: 'License has expired',
          expiresAt: license.expiresAt
        });
      }

      // Valid license
      res.json({
        success: true,
        valid: true,
        features: license.features,
        tenantId: license.tenantId,
        expiresAt: license.expiresAt,
        metadata: license.metadata
      });

    } catch (jwtError) {
      // Invalid signature or expired JWT
      logger.warn('License validation failed', {
        licenseKey: key.substring(0, 20) + '...',
        error: jwtError.message
      });

      res.json({
        success: true,
        valid: false,
        reason: jwtError.name === 'TokenExpiredError' ? 'License has expired' : 'Invalid signature'
      });
    }

  } catch (error) {
    logger.error('License validation error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'Validation failed',
      message: error.message
    });
  }
});

/**
 * PUT /licenses/:key/revoke
 * Mark license as revoked in DB
 * Subsequent validate calls return { valid: false }
 */
app.put('/licenses/:key/revoke', async (req, res) => {
  try {
    const { key } = req.params;
    const { reason } = req.body;

    // Find license
    const license = await License.findOne({
      where: { licenseKey: key }
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }

    if (license.isRevoked) {
      return res.json({
        success: true,
        message: 'License was already revoked',
        revokedAt: license.updatedAt
      });
    }

    // Revoke license
    license.isRevoked = true;
    license.metadata = {
      ...license.metadata,
      revokedAt: new Date().toISOString(),
      revokedReason: reason || 'No reason provided'
    };
    await license.save();

    logger.info('License revoked', {
      licenseId: license.id,
      tenantId: license.tenantId,
      reason
    });

    res.json({
      success: true,
      message: 'License revoked successfully',
      licenseKey: key,
      revokedAt: license.updatedAt
    });

  } catch (error) {
    logger.error('Failed to revoke license:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke license',
      message: error.message
    });
  }
});

/**
 * GET /health
 * Health check endpoint for Docker and monitoring
 * Returns: { status: 'ok', uptime }
 */
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();

    const health = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connected',
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    res.json(health);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'HR-SM License Server',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      createLicense: 'POST /licenses',
      validateLicense: 'GET /licenses/:key/validate',
      revokeLicense: 'PUT /licenses/:key/revoke',
      health: 'GET /health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Graceful shutdown
let server;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      
      sequelize.close().then(() => {
        logger.info('PostgreSQL connection closed');
        process.exit(0);
      }).catch((error) => {
        logger.error('Error closing database:', error);
        process.exit(1);
      });
    });
  }
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connection established');
    
    // Sync database models (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    logger.info('✅ Database models synchronized');
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`🚀 License Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 PostgreSQL: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
      logger.info(`🔐 RSA Keys: Loaded and ready`);
      logger.info(`\n📋 Available Endpoints:`);
      logger.info(`   POST   /licenses              - Create new license`);
      logger.info(`   GET    /licenses/:key/validate - Validate license`);
      logger.info(`   PUT    /licenses/:key/revoke   - Revoke license`);
      logger.info(`   GET    /health                 - Health check`);
    });
    
    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
