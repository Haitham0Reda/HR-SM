#!/usr/bin/env node
/**
 * Secret Generation Script
 * Generates cryptographically secure secrets for the application
 */

const crypto = require('crypto');

function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateBase64Secret(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64');
}

console.log('='.repeat(80));
console.log('GENERATED SECRETS - COPY THESE TO YOUR .env FILE');
console.log('='.repeat(80));
console.log('');

console.log('# JWT Secrets (256-bit / 32 bytes)');
console.log(`JWT_SECRET=${generateSecret(32)}`);
console.log(`PLATFORM_JWT_SECRET=${generateSecret(32)}`);
console.log('');

console.log('# Session Secret');
console.log(`SESSION_SECRET=${generateSecret(32)}`);
console.log('');

console.log('# Database Passwords (strong random passwords)');
console.log(`DB_PASSWORD=${generateBase64Secret(24)}`);
console.log(`REDIS_PASSWORD=${generateBase64Secret(24)}`);
console.log('');

console.log('# License Server API Key');
console.log(`LICENSE_SERVER_API_KEY=${generateSecret(32)}`);
console.log('');

console.log('# Legacy License Secret Key');
console.log(`LICENSE_SECRET_KEY=${generateSecret(32)}`);
console.log('');

console.log('='.repeat(80));
console.log('IMPORTANT: Store these secrets securely and never commit them to git!');
console.log('='.repeat(80));
