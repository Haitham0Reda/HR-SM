import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorHandler } from './core/errors/errorHandler.js';
import { platformAuthRoutes } from './platform/auth/routes/platformAuthRoutes.js';
import { tenantRoutes } from './platform/tenants/routes/tenantRoutes.js';
import { subscriptionRoutes } from './platform/subscriptions/routes/subscriptionRoutes.js';
import { moduleRoutes } from './platform/modules/routes/moduleRoutes.js';
import { systemRoutes } from './platform/system/routes/systemRoutes.js';
import companyLogsRoutes from './routes/companyLogs.js';
// Enhanced rate limiting middleware
import { 
    authRateLimit, 
    sensitiveRateLimit, 
    publicRateLimit,
    globalRateLimit 
} from './middleware/enhancedRateLimit.middleware.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.PLATFORM_FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());

// Enhanced rate limiting with Redis support and license-based limits
// Global rate limiter as fallback for platform admin
app.use(globalRateLimit());

// Authentication endpoints - very strict rate limiting
app.use('/api/v1/platform/auth', authRateLimit);

// Sensitive platform operations - strict rate limiting
app.use('/api/v1/platform/tenants', sensitiveRateLimit);
app.use('/api/v1/platform/subscriptions', sensitiveRateLimit);
app.use('/api/v1/platform/modules', sensitiveRateLimit);
app.use('/api/v1/platform/system', sensitiveRateLimit);

// General platform routes - moderate rate limiting
app.use('/api', publicRateLimit);

// Routes
app.use('/api/v1/platform/auth', platformAuthRoutes);
app.use('/api/v1/platform/company-logs', companyLogsRoutes);
app.use('/api/v1/platform/tenants', tenantRoutes);
app.use('/api/v1/platform/subscriptions', subscriptionRoutes);
app.use('/api/v1/platform/modules', moduleRoutes);
app.use('/api/v1/platform/system', systemRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Platform service is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;
