import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorHandler } from './core/errors/errorHandler.js';
import { authRoutes } from './modules/hr-core/auth/routes/authRoutes.js';
import { tenantContext } from './core/middleware/tenantContext.js';
import { moduleGuard } from './core/middleware/moduleGuard.js';
import { moduleRegistry } from './core/registry/moduleRegistry.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.TENANT_FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    max: 1000, // Higher limit for authenticated users
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests from this IP, please try again in 15 minutes!',
    keyGenerator: (req) => {
        return req.tenantId || req.ip;
    }
});
app.use('/api', limiter);

// Tenant context middleware
app.use(tenantContext);

// Public routes (no auth required)
app.use('/api/v1/auth', authRoutes);

// Module routes (protected by auth and module guard)
app.use('/api/v1', moduleGuard, moduleRegistry.getRoutes());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Tenant service is running',
        tenantId: req.tenantId || 'none',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use(errorHandler);

export default app;
