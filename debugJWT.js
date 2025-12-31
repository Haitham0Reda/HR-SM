/**
 * Debug JWT Token
 * 
 * This script checks what's inside the JWT token
 */

import jwt from 'jsonwebtoken';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
const API_URL = `${SERVER_URL}/api/v1`;

async function debugJWT() {
    console.log('🔍 Debugging JWT Token...\n');
    
    try {
        // Step 1: Get authentication token
        console.log('1️⃣ Getting authentication token...');
        const response = await fetch(`${API_URL}/dev/auto-login`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('❌ Failed to get token:', data.message);
            return false;
        }
        
        const token = data.data.token;
        console.log('✅ Got token');
        
        // Step 2: Decode JWT without verification to see contents
        console.log('\n2️⃣ Decoding JWT token...');
        const decoded = jwt.decode(token);
        console.log('JWT Contents:', JSON.stringify(decoded, null, 2));
        
        // Step 3: Try to verify with tenant secret
        console.log('\n3️⃣ Verifying with tenant secret...');
        try {
            const tenantSecret = process.env.TENANT_JWT_SECRET || 'TenantSecretKey2024!@#$%^&*';
            const verifiedTenant = jwt.verify(token, tenantSecret);
            console.log('✅ Verified with tenant secret:', JSON.stringify(verifiedTenant, null, 2));
        } catch (error) {
            console.log('❌ Failed to verify with tenant secret:', error.message);
        }
        
        // Step 4: Try to verify with regular secret
        console.log('\n4️⃣ Verifying with regular secret...');
        try {
            const regularSecret = process.env.JWT_SECRET || 'kwW3sBhgZDk%WsNp';
            const verifiedRegular = jwt.verify(token, regularSecret);
            console.log('✅ Verified with regular secret:', JSON.stringify(verifiedRegular, null, 2));
        } catch (error) {
            console.log('❌ Failed to verify with regular secret:', error.message);
        }
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Debug JWT failed:', error);
        return false;
    }
}

// Run the debug
debugJWT().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Debug execution error:', error);
    process.exit(1);
});