import chalk from 'chalk';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setupGmailAppPassword() {
    console.log(chalk.blue.bold('\n📧 Gmail App Password Setup Guide\n'));
    console.log(chalk.yellow('⚠️  IMPORTANT: You need a Gmail App Password, NOT your regular Gmail password!\n'));
    
    console.log(chalk.white('Step-by-step instructions:\n'));
    console.log(chalk.green('1.') + ' Open this link in your browser:');
    console.log(chalk.cyan('   https://myaccount.google.com/apppasswords\n'));
    
    console.log(chalk.green('2.') + ' If you see "2-Step Verification is not turned on":');
    console.log('   - First enable 2-Factor Authentication at:');
    console.log(chalk.cyan('     https://myaccount.google.com/security'));
    console.log('   - Then come back to the App Passwords page\n');
    
    console.log(chalk.green('3.') + ' On the App Passwords page:');
    console.log('   - Enter app name: ' + chalk.yellow('HR-SM'));
    console.log('   - Click "Create"');
    console.log('   - Google will show you a 16-character password\n');
    
    console.log(chalk.green('4.') + ' Copy that password (it looks like: ' + chalk.yellow('abcd efgh ijkl mnop') + ')');
    console.log('   - You can copy it WITH or WITHOUT spaces\n');
    
    const ready = await question(chalk.blue('Have you generated the App Password? (yes/no): '));
    
    if (ready.toLowerCase() !== 'yes' && ready.toLowerCase() !== 'y') {
        console.log(chalk.yellow('\n👋 No problem! Come back when you have the App Password.'));
        console.log(chalk.white('Run this script again: ') + chalk.cyan('node server/scripts/setupGmailAppPassword.js\n'));
        rl.close();
        return;
    }
    
    console.log('');
    const appPassword = await question(chalk.blue('Paste your 16-character App Password here: '));
    
    // Remove all spaces from the password
    const cleanPassword = appPassword.replace(/\s+/g, '');
    
    if (cleanPassword.length !== 16) {
        console.log(chalk.red('\n❌ Error: App Password should be exactly 16 characters (without spaces)'));
        console.log(chalk.yellow('   You entered: ' + cleanPassword.length + ' characters'));
        console.log(chalk.white('\n   Please try again and make sure to copy the complete password.\n'));
        rl.close();
        return;
    }
    
    // Update .env file
    const envPath = path.join(__dirname, '../../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the EMAIL_PASSWORD line
    const emailPasswordRegex = /EMAIL_PASSWORD=.*/;
    if (emailPasswordRegex.test(envContent)) {
        envContent = envContent.replace(emailPasswordRegex, `EMAIL_PASSWORD=${cleanPassword}`);
    } else {
        // If EMAIL_PASSWORD doesn't exist, add it after EMAIL_USER
        envContent = envContent.replace(
            /(EMAIL_USER=.*)/,
            `$1\nEMAIL_PASSWORD=${cleanPassword}`
        );
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log(chalk.green('\n✅ App Password saved to .env file!'));
    console.log(chalk.white('\nYour configuration:'));
    console.log(chalk.cyan('   Email: ') + 'devhaithammoreda@gmail.com');
    console.log(chalk.cyan('   Password: ') + cleanPassword.substring(0, 4) + '************');
    
    console.log(chalk.blue.bold('\n🧪 Testing email connection...\n'));
    
    rl.close();
    
    // Test the connection
    const { default: emailService } = await import('../services/email.service.js');
    
    // Force re-initialization
    emailService.initialized = false;
    emailService.transporter = null;
    await emailService.initialize();
    
    const isVerified = await emailService.verify();
    
    if (isVerified) {
        console.log(chalk.green.bold('✅ SUCCESS! Email is configured correctly!\n'));
        console.log(chalk.white('You can now:'));
        console.log(chalk.green('  ✓') + ' Send password reset emails');
        console.log(chalk.green('  ✓') + ' Send leave request notifications');
        console.log(chalk.green('  ✓') + ' Send backup reports');
        console.log(chalk.green('  ✓') + ' Send system notifications\n');
        
        const sendTest = await question(chalk.blue('Would you like to send a test email? (yes/no): '));
        
        if (sendTest.toLowerCase() === 'yes' || sendTest.toLowerCase() === 'y') {
            console.log(chalk.blue('\n📤 Sending test email...\n'));
            
            const result = await emailService.sendEmail({
                to: 'devhaithammoreda@gmail.com',
                subject: '✅ HR-SM Email Test - Success!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4CAF50;">🎉 Email Configuration Successful!</h2>
                        <p>Your HR Management System is now configured to send emails!</p>
                        <p style="background: #f5f5f5; padding: 10px; border-radius: 5px;">
                            <strong>From: devhaithammoreda@gmail.com</strong>
                        </p>
                        <h3>Available Features:</h3>
                        <ul>
                            <li>✅ Password Reset Emails</li>
                            <li>✅ Leave Request Notifications</li>
                            <li>✅ Backup Reports</li>
                            <li>✅ System Notifications</li>
                        </ul>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            Sent at ${new Date().toLocaleString()}
                        </p>
                    </div>
                `
            });
            
            if (result.success) {
                console.log(chalk.green('✅ Test email sent!'));
                console.log(chalk.white('📬 Check your inbox at: ') + chalk.cyan('devhaithammoreda@gmail.com\n'));
            } else {
                console.log(chalk.red('❌ Failed to send test email: ' + result.error + '\n'));
            }
        }
    } else {
        console.log(chalk.red.bold('❌ Email verification failed!\n'));
        console.log(chalk.yellow('Possible issues:'));
        console.log(chalk.white('  • The App Password might be incorrect'));
        console.log(chalk.white('  • 2-Factor Authentication might not be enabled'));
        console.log(chalk.white('  • Try generating a new App Password\n'));
    }
}

setupGmailAppPassword().catch(error => {
    console.error(chalk.red('\n❌ Error: ' + error.message + '\n'));
    rl.close();
});
