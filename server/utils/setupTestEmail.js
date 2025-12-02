import nodemailer from 'nodemailer';

/**
 * Creates a test email account using Ethereal Email
 * This is perfect for development/testing - emails are captured but not actually sent
 * View emails at: https://ethereal.email
 */
export const setupTestEmail = async () => {
    try {

        // Create a test account
        const testAccount = await nodemailer.createTestAccount();


        return testAccount;
    } catch (error) {

        throw error;
    }
};

// Run if called directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
    setupTestEmail().catch(console.error);
}
