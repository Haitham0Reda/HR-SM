import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

console.log('\n🔍 Email Configuration Diagnostics\n');
console.log('Environment Variables:');
console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('  EMAIL_USER:', process.env.EMAIL_USER);
console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? `${process.env.EMAIL_PASSWORD.substring(0, 4)}****${process.env.EMAIL_PASSWORD.substring(12)}` : 'NOT SET');
console.log('  Password Length:', process.env.EMAIL_PASSWORD?.length || 0);
console.log('');

console.log('📋 Checklist for Gmail App Password:\n');
console.log('1. Is 2-Factor Authentication enabled?');
console.log('   Check at: https://myaccount.google.com/security\n');

console.log('2. Did you generate an App Password (not regular password)?');
console.log('   Generate at: https://myaccount.google.com/apppasswords\n');

console.log('3. Is the App Password exactly 16 characters (no spaces)?');
console.log('   Current length:', process.env.EMAIL_PASSWORD?.length || 0, process.env.EMAIL_PASSWORD?.length === 16 ? '✅' : '❌');
console.log('');

console.log('4. Common issues:');
console.log('   • Using regular Gmail password instead of App Password');
console.log('   • 2FA not enabled on the Gmail account');
console.log('   • App Password copied with extra spaces or characters');
console.log('   • Account security settings blocking "less secure apps"');
console.log('');

console.log('🧪 Testing direct SMTP connection...\n');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    debug: true, // Enable debug output
    logger: true // Log information
});

try {
    await transporter.verify();
    console.log('\n✅ SMTP connection successful!');
} catch (error) {
    console.log('\n❌ SMTP connection failed:');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    console.log('   Response:', error.response);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Go to: https://myaccount.google.com/security');
    console.log('   2. Make sure "2-Step Verification" is ON');
    console.log('   3. Go to: https://myaccount.google.com/apppasswords');
    console.log('   4. Create a NEW App Password for "Mail"');
    console.log('   5. Copy the 16-character password (remove spaces)');
    console.log('   6. Update EMAIL_PASSWORD in your .env file');
    console.log('   7. Run this script again');
}
