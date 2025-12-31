/**
 * Development Auto-Login Utility
 * Automatically logs in a test user for development purposes
 */

import { generateTenantToken } from '../core/auth/tenantAuth.js';

/**
 * Generate a test JWT token for development
 */
export function generateTestToken() {
    const testUser = {
        userId: "69554f0f74966f1694bcbbec",
        tenantId: "techcorp_solutions",
        role: "admin"
    };

    const token = generateTenantToken(testUser.userId, testUser.tenantId, testUser.role);

    return {
        token,
        user: {
            id: testUser.userId,
            tenantId: testUser.tenantId,
            role: testUser.role,
            email: 'admin@techcorp.com',
            name: 'System Administrator'
        }
    };
}

/**
 * Development auto-login endpoint
 */
export function createAutoLoginRoute(app) {
    if (process.env.NODE_ENV === 'development') {
        app.get('/api/v1/dev/auto-login', (req, res) => {
            try {
                const { token, user } = generateTestToken();
                
                res.json({
                    success: true,
                    message: 'Auto-login successful (development only)',
                    data: {
                        user,
                        token
                    }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Auto-login failed',
                    error: error.message
                });
            }
        });
        
        console.log('✓ Development auto-login endpoint available at /api/dev/auto-login');
    }
}