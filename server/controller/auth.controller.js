import User from '../models/user.model.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Configure email transporter (you'll need to set these in your .env)
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
};

// Forgot Password - Send reset token via email
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Save hashed token and expiry to user
        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        // Email content
        const message = `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your HR-SM account.</p>
            <p>Please click the link below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 30 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <br>
            <p>Best regards,<br>HR-SM Team</p>
        `;

        try {
            // Send email
            const transporter = createTransporter();
            await transporter.sendMail({
                from: `"HR-SM" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Password Reset Request - HR-SM',
                html: message,
            });

            res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Clear reset token if email fails
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again later.' });
    }
};

// Reset Password - Verify token and update password
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Hash the token from URL to compare with stored hash
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token and not expired
        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Update password (will be hashed by pre-save middleware)
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again later.' });
    }
};

// Verify Reset Token - Check if token is valid
export const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        res.json({ message: 'Token is valid', email: user.email });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again later.' });
    }
};
