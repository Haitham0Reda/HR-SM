import nodemailer from 'nodemailer';

/**
 * Creates a test email account using Ethereal Email
 * This is perfect for development/testing - emails are captured but not actually sent
 * View emails at: https://ethereal.email
 */
export const setupTestEmail = async () => {
    try {
        console.log('Creating test email account...');
        
        // Create a test account
        const testAccount = await nodemailer.createTestAccount();
        
        console.log('\n✅ Test email account created successfully!\n');
        console.log('Add these to your .env file:\n');
        console.log(`EMAIL_HOST=${testAccount.smtp.host}`);
        console.log(`EMAIL_PORT=${testAccount.smtp.port}`);
        console.log(`EMAIL_USER=${testAccount.user}`);
        console.log(`EMAIL_PASSWORD=${testAccount.pass}`);
        console.log('\nTo view sent emails, visit: https://ethereal.email/messages');
        console.log(`Login with: ${testAccount.user} / ${testAccount.pass}\n`);
        
        return testAccount;
    } catch (error) {
        console.error('Failed to create test account:', error);
        throw error;
    }
};

// Run if called directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
    setupTestEmail().catch(console.error);
}
