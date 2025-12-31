#!/usr/bin/env node

/**
 * Test RSA Key Pair Script
 * 
 * This script tests if the RSA key pair is working correctly
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

console.log('🔑 Testing RSA key pair...');

try {
    // Load keys
    const privateKeyPath = path.resolve('../hrsm-license-server/keys/private.pem');
    const publicKeyPath = path.resolve('../hrsm-license-server/keys/public.pem');
    
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    
    console.log('✅ Keys loaded successfully');
    console.log(`   Private key starts with: ${privateKey.substring(0, 30)}...`);
    console.log(`   Public key starts with: ${publicKey.substring(0, 30)}...`);
    
    // Create a test token
    const testPayload = {
        ln: 'TEST-LICENSE-123',
        tid: 'test-tenant',
        type: 'enterprise',
        features: ['hr-core', 'tasks'],
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };
    
    console.log('\n🔧 Creating test token...');
    const token = jwt.sign(testPayload, privateKey, {
        algorithm: 'RS256',
        issuer: 'HRSM-License-Server',
        subject: 'test-tenant'
    });
    
    console.log('✅ Test token created');
    console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...`);
    
    // Verify the token
    console.log('\n🔍 Verifying test token...');
    const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'HRSM-License-Server'
    });
    
    console.log('✅ Token verification successful!');
    console.log(`   License Number: ${decoded.ln}`);
    console.log(`   Tenant ID: ${decoded.tid}`);
    console.log(`   Type: ${decoded.type}`);
    console.log(`   Features: ${decoded.features.join(', ')}`);
    
    console.log('\n🎉 RSA key pair is working correctly!');
    console.log('✅ The issue is not with the key pair itself.');
    
} catch (error) {
    console.log('❌ RSA key pair test failed:', error.message);
    console.log('   This indicates the keys may be corrupted or mismatched');
}