import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: 'unknown',
        rsaKeys: 'unknown',
        memory: 'unknown'
      }
    };

    // Check database connection
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        health.checks.database = 'healthy';
      } else {
        health.checks.database = 'disconnected';
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Check RSA keys
    try {
      const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem';
      const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem';
      
      if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        health.checks.rsaKeys = 'healthy';
      } else {
        health.checks.rsaKeys = 'missing';
        health.status = 'unhealthy';
      }
    } catch (error) {
      health.checks.rsaKeys = 'error';
      health.status = 'unhealthy';
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    if (memoryUsageMB < 500) {
      health.checks.memory = 'healthy';
    } else if (memoryUsageMB < 1000) {
      health.checks.memory = 'warning';
      if (health.status === 'healthy') health.status = 'degraded';
    } else {
      health.checks.memory = 'critical';
      health.status = 'unhealthy';
    }

    health.memory = {
      heapUsed: `${memoryUsageMB}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
    };

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      data: health
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check for monitoring systems
router.get('/detailed', async (req, res) => {
  try {
    const detailed = {
      service: 'hrsm-license-server',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 4000,
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      checks: {},
      metrics: {}
    };

    // Database check with details
    try {
      if (mongoose.connection.readyState === 1) {
        const dbStats = await mongoose.connection.db.stats();
        detailed.checks.database = {
          status: 'healthy',
          connected: true,
          collections: dbStats.collections,
          dataSize: `${Math.round(dbStats.dataSize / 1024 / 1024)}MB`,
          storageSize: `${Math.round(dbStats.storageSize / 1024 / 1024)}MB`,
          indexes: dbStats.indexes
        };
      } else {
        detailed.checks.database = {
          status: 'disconnected',
          connected: false,
          readyState: mongoose.connection.readyState
        };
        detailed.status = 'degraded';
      }
    } catch (error) {
      detailed.checks.database = {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
      detailed.status = 'unhealthy';
    }

    // RSA Keys check with details
    try {
      const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem';
      const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem';
      
      const privateExists = fs.existsSync(privateKeyPath);
      const publicExists = fs.existsSync(publicKeyPath);
      
      detailed.checks.rsaKeys = {
        status: (privateExists && publicExists) ? 'healthy' : 'missing',
        privateKey: {
          exists: privateExists,
          path: privateKeyPath
        },
        publicKey: {
          exists: publicExists,
          path: publicKeyPath
        }
      };

      if (!privateExists || !publicExists) {
        detailed.status = 'unhealthy';
      }
    } catch (error) {
      detailed.checks.rsaKeys = {
        status: 'error',
        error: error.message
      };
      detailed.status = 'unhealthy';
    }

    // System metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    detailed.metrics = {
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        unit: 'MB'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        unit: 'microseconds'
      },
      uptime: {
        process: process.uptime(),
        system: require('os').uptime(),
        unit: 'seconds'
      }
    };

    const statusCode = detailed.status === 'healthy' ? 200 : 
                      detailed.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: detailed.status !== 'unhealthy',
      data: detailed
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Detailed health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;