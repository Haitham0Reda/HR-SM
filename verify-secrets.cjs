#!/usr/bin/env node
/**
 * Secret Verification Script
 * Verifies that all required secrets are present in .env file
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'PLATFORM_JWT_SECRET',
  'SESSION_SECRET',
  'LICENSE_SERVER_API_KEY',
  'LICENSE_SECRET_KEY',
  'LICENSE_DATABASE_URL',
  'MAIN_DATABASE_URL'
];

const OPTIONAL_SECRETS = [
  'REDIS_PASSWORD',
  'RSA_PRIVATE_KEY_PATH',
  'RSA_PUBLIC_KEY_PATH'
];

console.log('='.repeat(80));
console.log('SECRET VERIFICATION');
console.log('='.repeat(80));
console.log('');

// Check if .env exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: .env file not found!');
  console.error('   Run: node generate-secrets.cjs to generate new secrets');
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split(/\r?\n/).forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  }
});

// Check required secrets
let allPresent = true;
console.log('Required Secrets:');
REQUIRED_SECRETS.forEach(secret => {
  const value = envVars[secret];
  if (!value || value.includes('REPLACE_WITH') || value.includes('your-')) {
    console.log(`  ❌ ${secret}: MISSING or using placeholder`);
    allPresent = false;
  } else {
    const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
    console.log(`  ✅ ${secret}: ${preview}`);
  }
});

console.log('');
console.log('Optional Secrets:');
OPTIONAL_SECRETS.forEach(secret => {
  const value = envVars[secret];
  if (value && !value.includes('REPLACE_WITH')) {
    const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`  ✅ ${secret}: ${preview}`);
  } else {
    console.log(`  ⚠️  ${secret}: Not configured (optional)`);
  }
});

console.log('');
console.log('='.repeat(80));

if (allPresent) {
  console.log('✅ All required secrets are present!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Update PostgreSQL password to match DB_PASSWORD in .env');
  console.log('  2. Update Redis password if using Redis');
  console.log('  3. Run: npm run dev');
  console.log('='.repeat(80));
  process.exit(0);
} else {
  console.log('❌ Some required secrets are missing!');
  console.log('');
  console.log('Run: node generate-secrets.cjs');
  console.log('Then copy the generated secrets to your .env file');
  console.log('='.repeat(80));
  process.exit(1);
}
