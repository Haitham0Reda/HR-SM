import dotenv from 'dotenv';
import emailService from '../services/email.service.js';

dotenv.config();

async function testEmailSending() {
    console.log('\n🧪 Testing Gmail Email Sending...\n');
    
    // Display current configuration
    const serviceInfo = emailService.getServiceInfo();
    console.log('📧 Email Service Configuration:');
    console.log('   Type:', serviceInfo.type);
    console.log('   User:', serviceInfo.user);
    console.log('   Configured:', serviceInfo.configured ? '✅' : '❌');
    console.log('');

    // Verify connection
    console.log('🔍 Verifying email service connection...');
    const isVerified = await emailService.verify();
    
    if (!isVerified) {
        console.error('❌ Email service verification failed!');
        console.log('\n💡 Troubleshooting tips:');
        console.log('   1. Make sure you used an App Password (not your regular Gmail password)');
        console.log('   2. Check that 2-Factor Authentication is enabled on your Gmail account');
        console.log('   3. Generate a new App Password at: https://myaccount.google.com/apppasswords');
        process.exit(1);
    }

    console.log('✅ Email service verified successfully!\n');

    // Send test email
    console.log('📤 Sending test email...');
    const result = await emailService.sendEmail({
        to: process.env.EMAIL_USER, // Send to yourself
        subject: '✅ HR-SM Email Test - Success!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4CAF50;">🎉 Email Configuration Successful!</h2>
                <p>Your HR Management System is now configured to send emails from:</p>
                <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
                    <strong>${process.env.EMAIL_USER}</strong>
                </p>
                <h3>What's working:</h3>
                <ul>
                    <li>✅ SMTP Connection</li>
                    <li>✅ Authentication</li>
                    <li>✅ Email Sending</li>
                </ul>
                <h3>Available Features:</h3>
                <ul>
                    <li>Password Reset Emails</li>
                    <li>Leave Request Notifications</li>
                    <li>Backup Reports</li>
                    <li>System Notifications</li>
                </ul>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Sent from HR-SM at ${new Date().toLocaleString()}
                </p>
            </div>
        `,
        text: 'Your HR Management System email is configured successfully!'
    });

    if (result.success) {
        console.log('✅ Test email sent successfully!');
        console.log('📬 Check your inbox at:', process.env.EMAIL_USER);
        console.log('   Message ID:', result.messageId);
        console.log('\n🎉 Email setup complete! Your system can now send emails.');
    } else {
        console.error('❌ Failed to send test email:', result.error);
        console.log('\n💡 Common issues:');
        console.log('   - App Password might be incorrect');
        console.log('   - 2FA might not be enabled');
        console.log('   - Gmail security settings might be blocking the app');
    }
}

testEmailSending().catch(error => {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
});
