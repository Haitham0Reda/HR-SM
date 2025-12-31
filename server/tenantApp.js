import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorHandler } from './core/errors/errorHandler.js';
import { authRoutes } from './modules/hr-core/auth/routes/authRoutes.js';
import { tenantContext } from './core/middleware/tenantContext.js';
import { moduleGuard } from './core/middleware/moduleGuard.js';
import { moduleRegistry } from './core/registry/moduleRegistry.js';
import { dynamicModuleLoader } from './middleware/dynamicModuleLoader.middleware.js';
import hardcopyRoutes from './modules/documents/routes/hardcopy.routes.js';
import { setupCompanyLogging, logResponseCompletion, logCompanyErrors, trackUserActivity } from './middleware/companyLogging.js';
import companyLogsRoutes from './routes/companyLogs.js';
// Enhanced rate limiting middleware
import { 
    authRateLimit, 
    apiRateLimit, 
    publicRateLimit,
    globalRateLimit 
} from './middleware/enhancedRateLimit.middleware.js';

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

// Enhanced rate limiting with Redis support and license-based limits
// Global rate limiter as fallback
app.use(globalRateLimit());

// Authentication endpoints - very strict rate limiting
app.use('/api/v1/auth', authRateLimit);

// General API routes - license-based rate limiting
app.use('/api/v1', apiRateLimit);

// Public routes - lenient rate limiting
app.use('/api', publicRateLimit);

// Public routes (no auth required) - BEFORE tenant context
app.use('/api/v1/auth', authRoutes);

// Company logging middleware (basic setup)
app.use(setupCompanyLogging);
app.use(logResponseCompletion);

// Tenant context middleware (for protected routes)
app.use(tenantContext);

// Dynamic module loader (determines available modules per tenant)
// This should be after tenant context and license validation
app.use(dynamicModuleLoader);

// User activity tracking middleware (after auth context is available)
// This will be applied to all routes that come after this point
app.use('/api/v1', trackUserActivity);

// Company logs routes (protected) - after tenant context
app.use('/api/v1/platform/company-logs', companyLogsRoutes);

// Module availability routes (protected) - after tenant context
import moduleAvailabilityRoutes from './routes/moduleAvailability.routes.js';
app.use('/api/v1/modules', moduleAvailabilityRoutes);

// Hardcopies routes (part of documents module)
app.use('/api/v1/hardcopies', hardcopyRoutes);

// Module routes (protected by auth and module guard)
// Note: moduleRegistry.getRoutes() method needs to be implemented
// For now, routes are loaded individually above

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Tenant service is running',
        tenantId: req.tenantId || 'none',
        timestamp: new Date().toISOString()
    });
});

// Company error logging middleware
app.use(logCompanyErrors);

// Error handling middleware
app.use(errorHandler);

export default app;
