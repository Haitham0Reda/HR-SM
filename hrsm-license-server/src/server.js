#!/usr/bin/env node
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import licenseRoutes from './routes/licenseRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

// Import Redis service for rate limiting
import redisService from '../../server/core/services/redis.service.js';

// Import API key authentication
import { initializeDefaultApiKeys, logApiKeyUsage } from './middleware/apiKeyAuth.middleware.js';

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
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
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

const app = express();
const PORT = process.env.PORT || 4000;

// Enhanced security middleware for license server
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https:"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: false
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

// Enhanced rate limiting with Redis support
import { licenseServerRateLimit } from '../../server/middleware/enhancedRateLimit.middleware.js';
app.use(licenseServerRateLimit());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// API key usage logging
app.use(logApiKeyUsage);

// MongoDB connection with retry logic and optimized settings
const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm-licenses';
      
      // Optimized connection options for license server
      const options = {
        // Enhanced connection pool settings for license server
        maxPoolSize: 15, // Slightly smaller pool for license server
        minPoolSize: 3,  // Maintain warm connections
        maxIdleTimeMS: 30000,
        
        // Timeout settings optimized for license operations
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        
        // Retry settings
        retryWrites: true,
        retryReads: true,
        
        // Write concern for license operations (ensure durability)
        writeConcern: {
          w: 'majority',
          journal: true // Use journal instead of deprecated j option
        },
        
        // Read preference
        readPreference: 'primaryPreferred',
        
        // Compression
        compressors: ['zlib', 'snappy'],
        
        // Connection monitoring
        heartbeatFrequencyMS: 10000,
        
        // Auto-index creation (disable in production)
        autoIndex: process.env.NODE_ENV !== 'production'
      };
      
      await mongoose.connect(mongoUri, options);

      logger.info(`✅ MongoDB connected successfully to: ${mongoUri}`);
      break;
    } catch (error) {
      logger.error(`❌ MongoDB connection attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        logger.error('❌ All MongoDB connection attempts failed. Exiting...');
        process.exit(1);
      }
      
      logger.info(`⏳ Retrying MongoDB connection in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
};

// MongoDB event handlers
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

// Routes
app.use('/health', healthRoutes);
app.use('/licenses', licenseRoutes);
app.use('/metrics', metricsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HR-SM License Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'operational'
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

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
  
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
    // Connect to MongoDB first
    await connectDB();
    
    // Initialize API keys
    console.log('🔐 Initializing API keys...');
    const apiKeys = initializeDefaultApiKeys();
    console.log('✅ API keys initialized');
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 License Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/hrsm-licenses'}`);
      logger.info(`🔐 RSA Keys: ${process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem'}`);
      logger.info(`🔑 API Keys initialized for secure access`);
    });
    
    // Export server for graceful shutdown
    global.server = server;
    
    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;