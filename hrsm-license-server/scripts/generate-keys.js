#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const generateKeys = () => {
    console.log('🔐 Generating RSA key pair for license server...');
    
    // Create keys directory if it doesn't exist
    const keysDir = path.join(process.cwd(), 'keys');
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }
    
    const privateKeyPath = path.join(keysDir, 'private.pem');
    const publicKeyPath = path.join(keysDir, 'public.pem');
    
    try {
        // Generate 4096-bit RSA private key
        console.log('Generating private key...');
        execSync(`openssl genpkey -algorithm RSA -out "${privateKeyPath}" -pkeyopt rsa_keygen_bits:4096`);
        
        // Extract public key
        console.log('Extracting public key...');
        execSync(`openssl rsa -pubout -in "${privateKeyPath}" -out "${publicKeyPath}"`);
        
        // Set proper permissions
        fs.chmodSync(privateKeyPath, 0o600); // Read/write for owner only
        fs.chmodSync(publicKeyPath, 0o644);  // Read for all, write for owner
        
        console.log('✅ RSA key pair generated successfully!');
        console.log(`Private key: ${privateKeyPath}`);
        console.log(`Public key: ${publicKeyPath}`);
        console.log('');
        console.log('⚠️  IMPORTANT SECURITY NOTES:');
        console.log('1. NEVER commit private.pem to Git');
        console.log('2. Keep private.pem secure and backed up');
        console.log('3. Copy public.pem to HR-SM backend for validation');
        console.log('4. Use environment variables for key paths in production');
        
    } catch (error) {
        console.error('❌ Failed to generate keys:', error.message);
        console.log('');
        console.log('Make sure OpenSSL is installed:');
        console.log('- Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
        console.log('- macOS: brew install openssl');
        console.log('- Linux: sudo apt-get install openssl');
        process.exit(1);
    }
};

generateKeys();