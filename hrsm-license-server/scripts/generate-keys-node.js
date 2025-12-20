#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const generateKeys = () => {
    console.log('🔐 Generating RSA key pair for license server using Node.js crypto...');
    
    // Create keys directory if it doesn't exist
    const keysDir = path.join(process.cwd(), 'keys');
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }
    
    const privateKeyPath = path.join(keysDir, 'private.pem');
    const publicKeyPath = path.join(keysDir, 'public.pem');
    
    try {
        console.log('Generating 4096-bit RSA key pair...');
        
        // Generate RSA key pair using Node.js crypto
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        // Write keys to files
        console.log('Writing private key...');
        fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
        
        console.log('Writing public key...');
        fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });
        
        console.log('✅ RSA key pair generated successfully!');
        console.log(`Private key: ${privateKeyPath}`);
        console.log(`Public key: ${publicKeyPath}`);
        console.log('');
        console.log('⚠️  IMPORTANT SECURITY NOTES:');
        console.log('1. NEVER commit private.pem to Git');
        console.log('2. Keep private.pem secure and backed up');
        console.log('3. Copy public.pem to HR-SM backend for validation');
        console.log('4. Use environment variables for key paths in production');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Copy keys/public.pem to your HR-SM backend server');
        console.log('2. Update .env file with correct key paths');
        console.log('3. Start the license server with: npm start');
        
    } catch (error) {
        console.error('❌ Failed to generate keys:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

generateKeys();