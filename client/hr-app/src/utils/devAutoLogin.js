/**
 * Development Auto-Login Helper
 * Automatically authenticates users in development mode
 */

/**
 * Auto-login for development
 */
export async function devAutoLogin() {
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    try {
        const response = await fetch('/api/v1/dev/auto-login');
        const data = await response.json();
        
        if (data.success) {
            // Store token in localStorage
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            console.log('✅ Development auto-login successful:', data.data.user.email);
            return data.data;
        } else {
            console.warn('⚠️ Development auto-login failed:', data.message);
            return null;
        }
    } catch (error) {
        console.warn('⚠️ Development auto-login error:', error.message);
        return null;
    }
}

/**
 * Check if user is authenticated, if not try auto-login
 */
export async function ensureAuthenticated() {
    // Check if already authenticated
    const token = localStorage.getItem('token');
    if (token) {
        return true;
    }

    // Try auto-login in development
    if (process.env.NODE_ENV === 'development') {
        const result = await devAutoLogin();
        return result !== null;
    }

    return false;
}