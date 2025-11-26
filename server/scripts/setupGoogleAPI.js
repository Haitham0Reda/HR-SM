/**
 * Google API Setup Helper
 * Helps configure Gmail API credentials
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Google API Setup Helper\n');
console.log('This script will help you configure Google API credentials.\n');

console.log('📋 Current Configuration:\n');

// Read .env file
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Check what's configured
const hasEmailHost = envContent.includes('EMAIL_HOST=');
const hasEmailUser = envContent.includes('EMAIL_USER=');
const hasEmailPassword = envContent.includes('EMAIL_PASSWORD=');
const hasGmailClientId = envContent.includes('GMAIL_CLIENT_ID=');
const hasGmailClientSecret = envContent.includes('GMAIL_CLIENT_SECRET=');
const hasGmailRefreshToken = envContent.includes('GMAIL_REFRESH_TOKEN=');

console.log('SMTP Configuration:');
console.log(`  EMAIL_HOST: ${hasEmailHost ? '✅ Set' : '❌ Not set'}`);
console.log(`  EMAIL_USER: ${hasEmailUser ? '✅ Set' : '❌ Not set'}`);
console.log(`  EMAIL_PASSWORD: ${hasEmailPassword ? '✅ Set' : '❌ Not set'}`);

console.log('\nGmail API Configuration:');
console.log(`  GMAIL_CLIENT_ID: ${hasGmailClientId ? '✅ Set' : '❌ Not set'}`);
console.log(`  GMAIL_CLIENT_SECRET: ${hasGmailClientSecret ? '✅ Set' : '❌ Not set'}`);
console.log(`  GMAIL_REFRESH_TOKEN: ${hasGmailRefreshToken ? '✅ Set' : '❌ Not set'}`);

console.log('\n' + '='.repeat(60));

if (hasEmailHost && hasEmailUser && hasEmailPassword) {
    console.log('\n✅ SMTP is configured and ready to use!');
    console.log('\nTo test email sending, run:');
    console.log('  npm run test-backup\n');
} else {
    console.log('\n⚠️  SMTP is not fully configured.');
    console.log('\nQuick Setup (2 minutes):');
    console.log('1. Go to: https://myaccount.google.com/apppasswords');
    console.log('2. Generate an App Password');
    console.log('3. Update .env file with:');
    console.log('   EMAIL_HOST=smtp.gmail.com');
    console.log('   EMAIL_PORT=587');
    console.log('   EMAIL_USER=devhaithammoreda@gmail.com');
    console.log('   EMAIL_PASSWORD=your-app-password\n');
}

if (hasGmailClientId && hasGmailClientSecret && hasGmailRefreshToken) {
    console.log('✅ Gmail API is configured!');
    console.log('   Your system will use OAuth2 for better security.\n');
} else {
    console.log('ℹ️  Gmail API is not configured (optional).');
    console.log('   For advanced features, see: GOOGLE_API_SETUP_GUIDE.md\n');
}

console.log('='.repeat(60));
console.log('\n📚 Documentation:');
console.log('  - Quick Setup: GMAIL_APP_PASSWORD_GUIDE.md');
console.log('  - Advanced Setup: GOOGLE_API_SETUP_GUIDE.md');
console.log('  - Email Details: EMAIL_BACKUP_SETUP.md\n');

console.log('💡 Recommendation:');
console.log('  Start with SMTP (App Password) for quick setup.');
console.log('  Upgrade to Gmail API later for advanced features.\n');

// Check if googleapis is installed
try {
    await import('googleapis');
    console.log('✅ googleapis package is installed (Gmail API ready)\n');
} catch (error) {
    console.log('ℹ️  googleapis package not installed');
    console.log('   To use Gmail API, run: npm install googleapis\n');
}

console.log('🚀 Next Steps:');
console.log('  1. Configure SMTP credentials in .env');
console.log('  2. Run: npm run test-backup');
console.log('  3. Check your email inbox!\n');
