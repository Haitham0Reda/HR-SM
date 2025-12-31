/**
 * Quick authentication fix - run this in browser console
 * Go to http://localhost:3000 and paste this in the browser console
 */

async function quickAuthFix() {
    console.log('🔧 Running quick authentication fix...');
    
    try {
        // Test auto-login endpoint
        const response = await fetch('http://localhost:5000/api/v1/dev/auto-login');
        const data = await response.json();
        
        if (data.success) {
            // Store tokens
            localStorage.setItem('tenant_token', data.data.token);
            localStorage.setItem('tenant_id', data.data.user.tenantId);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            
            console.log('✅ Authentication successful!');
            console.log('User:', data.data.user.email);
            console.log('Tenant:', data.data.user.tenantId);
            console.log('🔄 Reloading page...');
            
            // Reload the page to reinitialize with tokens
            window.location.reload();
        } else {
            console.error('❌ Auto-login failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Authentication error:', error.message);
    }
}

// Run the fix
quickAuthFix();