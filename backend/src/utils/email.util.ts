import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

/**
 * Email configuration and transporter
 */
const createTransporter = () => {
    // Check if SMTP credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('⚠️  SMTP credentials not configured. Emails will be logged to console only.');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // Automatically true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const transporter = createTransporter();

/**
 * Send OTP via email
 */
export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
    const mailOptions = {
        from: `"RTM Dating App" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your OTP Verification Code',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .otp-box {
                        background: #f0f0f0;
                        border: 2px dashed #667eea;
                        padding: 20px;
                        text-align: center;
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        color: #667eea;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        color: #666;
                        font-size: 12px;
                    }
                    .warning {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Email Verification</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>You requested an OTP code to verify your email address. Please use the code below:</p>
                        
                        <div class="otp-box">
                            ${otp}
                        </div>
                        
                        <p>This code will expire in <strong>10 minutes</strong>.</p>
                        
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong><br>
                            If you didn't request this code, please ignore this email. Never share your OTP with anyone.
                        </div>
                        
                        <p>Best regards,<br>RTM Dating App Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} RTM Dating App. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Your OTP Verification Code

Hello,

You requested an OTP code to verify your email address. Please use the code below:

OTP: ${otp}

This code will expire in 10 minutes.

Security Notice: If you didn't request this code, please ignore this email. Never share your OTP with anyone.

Best regards,
RTM Dating App Team

This is an automated message, please do not reply to this email.
        `,
    };

    if (transporter) {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ OTP email sent to ${email}`);
        } catch (error: any) {
            console.error(`❌ Failed to send OTP email to ${email}:`, error);
            throw new Error(`Failed to send OTP email: ${error.message || error}`);
        }
    } else {
        // Development mode - log OTP to console
        console.log(`📧 [DEV MODE] OTP for ${email}: ${otp}`);
        console.log('⚠️  Configure SMTP_USER and SMTP_PASSWORD in .env to send real emails');
    }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email: string, firstName: string): Promise<void> => {
    const mailOptions = {
        from: `"RTM Dating App" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to RTM Dating App! 💕',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        color: #666;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to RTM! 💕</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${firstName},</p>
                        <p>Welcome to RTM Dating App! We're excited to have you join our community.</p>
                        
                        <p>Here's what you can do next:</p>
                        <ul>
                            <li>✅ Complete your profile</li>
                            <li>📸 Add your best photos</li>
                            <li>💕 Start matching with amazing people</li>
                            <li>💬 Begin conversations</li>
                        </ul>
                        
                        <p>Ready to find your match?</p>
                        
                        <p>Best regards,<br>RTM Dating App Team</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} RTM Dating App. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    if (transporter) {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Welcome email sent to ${email}`);
        } catch (error) {
            console.error(`❌ Failed to send welcome email to ${email}:`, error);
            // Don't throw error for welcome email - it's not critical
        }
    } else {
        console.log(`📧 [DEV MODE] Welcome email would be sent to ${email}`);
    }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
    email: string,
    resetToken: string
): Promise<void> => {
    const resetUrl = `${process.env.API_URL}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
        from: `"RTM Dating App" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        color: #666;
                        font-size: 12px;
                    }
                    .warning {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>You requested to reset your password. Click the button below to reset it:</p>
                        
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </div>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                        
                        <p>This link will expire in <strong>1 hour</strong>.</p>
                        
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong><br>
                            If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                        </div>
                        
                        <p>Best regards,<br>RTM Dating App Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message, please do not reply to this email.</p>
                        <p>&copy; ${new Date().getFullYear()} RTM Dating App. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    if (transporter) {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Password reset email sent to ${email}`);
        } catch (error) {
            console.error(`❌ Failed to send password reset email to ${email}:`, error);
            throw new Error('Failed to send password reset email');
        }
    } else {
        console.log(`📧 [DEV MODE] Password reset link for ${email}: ${resetUrl}`);
        console.log('⚠️  Configure SMTP_USER and SMTP_PASSWORD in .env to send real emails');
    }
};

/**
 * Verify SMTP connection
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
    if (!transporter) {
        console.log('⚠️  Email transporter not configured');
        return false;
    }

    try {
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');
        return true;
    } catch (error) {
        console.error('❌ SMTP connection failed:', error);
        return false;
    }
};
