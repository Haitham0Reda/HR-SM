/**
 * Clear Authentication Script
 * Run this in the browser console to clear all authentication data
 * 
 * Usage:
 * 1. Open browser developer tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Refresh the page
 */

console.log('🔧 Clearing authentication data...');

// Clear all authentication-related localStorage items
const authKeys = [
    'token',
    'tenant_token', 
    'tenant_id',
    'user',
    'auth_user',
    'currentUser',
    'authToken',
    'accessToken'
];

let clearedCount = 0;

authKeys.forEach(key => {
    if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✅ Cleared: ${key}`);
        clearedCount++;
    }
});

// Clear all sessionStorage items too
const sessionKeys = Object.keys(sessionStorage);
sessionKeys.forEach(key => {
    if (key.includes('auth') || key.includes('token') || key.includes('user')) {
        sessionStorage.removeItem(key);
        console.log(`✅ Cleared session: ${key}`);
        clearedCount++;
    }
});

// Clear any cookies that might contain auth data
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log(`🎉 Cleared ${clearedCount} authentication items`);
console.log('🔄 Refreshing page...');

// Refresh the page
setTimeout(() => {
    window.location.reload();
}, 1000);

console.log('✅ Authentication data cleared! You can now login with:');
console.log('   Email: admin@techcorp.com');
console.log('   Password: admin123');