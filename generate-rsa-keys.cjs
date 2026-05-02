#!/usr/bin/env node
/**
 * RSA Key Generation Script
 * Generates RSA key pair for JWT signing (if needed)
 * Keys are stored OUTSIDE the repository for security
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create keys directory outside repo (in user's home directory)
const homeDir = process.env.HOME || process.env.USERPROFILE;
const keysDir = path.join(homeDir, '.hrsm-keys');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Write keys
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

console.log('='.repeat(80));
console.log('RSA KEY PAIR GENERATED SUCCESSFULLY');
console.log('='.repeat(80));
console.log('');
console.log('Keys have been stored OUTSIDE the repository for security:');
console.log(`  Private Key: ${privateKeyPath}`);
console.log(`  Public Key:  ${publicKeyPath}`);
console.log('');
console.log('Add these to your .env file if using RSA-based JWT signing:');
console.log(`RSA_PRIVATE_KEY_PATH=${privateKeyPath}`);
console.log(`RSA_PUBLIC_KEY_PATH=${publicKeyPath}`);
console.log('');
console.log('='.repeat(80));
console.log('IMPORTANT: Never commit these keys to git!');
console.log('='.repeat(80));
