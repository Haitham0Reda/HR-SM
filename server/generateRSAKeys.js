#!/usr/bin/env node

/**
 * Generate RSA Key Pair Script
 * 
 * This script generates a proper RSA key pair for the license server
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

console.log('🔑 Generating new RSA key pair...');

try {
    // Generate RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // 2048-bit key
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    console.log('✅ RSA key pair generated successfully');

    // Write keys to files
    const keysDir = path.resolve('../hrsm-license-server/keys');
    const privateKeyPath = path.join(keysDir, 'private.pem');
    const publicKeyPath = path.join(keysDir, 'public.pem');

    // Ensure keys directory exists
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    // Write private key
    fs.writeFileSync(privateKeyPath, privateKey);
    console.log(`✅ Private key written to: ${privateKeyPath}`);

    // Write public key
    fs.writeFileSync(publicKeyPath, publicKey);
    console.log(`✅ Public key written to: ${publicKeyPath}`);

    console.log('\n🔍 Key pair details:');
    console.log(`   Private key starts with: ${privateKey.substring(0, 30)}...`);
    console.log(`   Public key starts with: ${publicKey.substring(0, 30)}...`);

    // Test the key pair
    console.log('\n🧪 Testing the new key pair...');
    
    const jwt = await import('jsonwebtoken');
    
    // Create a test token
    const testPayload = {
        ln: 'TEST-LICENSE-123',
        tid: 'test-tenant',
        type: 'enterprise',
        features: ['hr-core', 'tasks'],
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };
    
    const token = jwt.default.sign(testPayload, privateKey, {
        algorithm: 'RS256',
        issuer: 'HRSM-License-Server',
        subject: 'test-tenant'
    });
    
    console.log('✅ Test token created');
    
    // Verify the token
    const decoded = jwt.default.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'HRSM-License-Server'
    });
    
    console.log('✅ Test token verified successfully!');
    console.log(`   License Number: ${decoded.ln}`);
    console.log(`   Tenant ID: ${decoded.tid}`);
    
    console.log('\n🎉 New RSA key pair is working correctly!');
    console.log('🔄 Please restart the license server to use the new keys.');

} catch (error) {
    console.log('❌ Failed to generate RSA key pair:', error.message);
    process.exit(1);
}