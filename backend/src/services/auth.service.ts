import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../server';
import { generateTokenPair, verifyRefreshToken, TokenPair } from '../utils/jwt.util';
import {
    RegisterInput,
    LoginInput,
    SendOtpInput,
    VerifyOtpInput,
    RefreshTokenInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    CheckExistenceInput,
} from '../validators/auth.validator';

/**
 * Generate a 6-digit OTP
 */
const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash password
 */
const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 10);
};

/**
 * Compare password
 */
const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

/**
 * Register a new user
 */
export const registerUser = async (data: RegisterInput) => {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: data.email },
                { phoneNumber: data.phoneNumber },
            ],
        },
    });

    if (existingUser) {
        if (existingUser.email === data.email) {
            throw new Error('Email already registered');
        }
        if (existingUser.phoneNumber === data.phoneNumber) {
            throw new Error('Phone number already registered');
        }
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Calculate age if dateOfBirth is provided
    let age: number | undefined;
    let dateOfBirth: Date | undefined;

    if (data.dateOfBirth) {
        dateOfBirth = new Date(data.dateOfBirth);
        const today = new Date();
        age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
            age--;
        }
    }

    // Create user with profile
    const user = await prisma.user.create({
        data: {
            email: data.email,
            phoneNumber: data.phoneNumber,
            password: hashedPassword,
            profile: {
                create: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    dateOfBirth: dateOfBirth || new Date('2000-01-01'), // Default if not provided
                    age: age || 18, // Default age if not provided
                    gender: (data.gender as 'MALE' | 'FEMALE') || 'MALE', // Default gender if not provided
                    zodiacSign: 'Unknown', // Can be calculated from dateOfBirth later
                },
            },
        },
        select: {
            id: true,
            email: true,
            phoneNumber: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            createdAt: true,
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dateOfBirth: true,
                    age: true,
                    gender: true,
                },
            },
        },
    });

    // Generate tokens
    const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
    });

    // Save refresh token
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
    });

    return {
        user,
        tokens,
    };
};

/**
 * Login user
 */
export const loginUser = async (data: LoginInput) => {
    // Find user by email or phone
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: data.emailOrPhone },
                { phoneNumber: data.emailOrPhone },
            ],
        },
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await comparePassword(data.password, user.password);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
    });

    // Save refresh token and update last active
    await prisma.user.update({
        where: { id: user.id },
        data: {
            refreshToken: tokens.refreshToken,
            lastActive: new Date(),
            isOnline: true,
        },
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
        user: userWithoutPassword,
        tokens,
    };
};

/**
 * Send OTP for verification
 */
export const sendOTP = async (data: SendOtpInput) => {
    // Find user
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: data.emailOrPhone },
                { phoneNumber: data.emailOrPhone },
            ],
        },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await prisma.oTP.create({
        data: {
            emailOrPhone: data.emailOrPhone,
            otp,
            type: data.type,
            expiresAt,
        },
    });

    // Send OTP via email or SMS
    if (data.type === 'email') {
        const { sendOTPEmail } = await import('../utils/email.util');
        await sendOTPEmail(user.email, otp);
    } else {
        // TODO: Implement SMS sending via Twilio
        console.log(`📱 SMS OTP for ${data.emailOrPhone}: ${otp}`);
        console.log('⚠️  Configure Twilio credentials in .env to send real SMS');
    }

    return {
        message: 'OTP sent successfully',
        // In production, don't return OTP
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    };
};

/**
 * Verify OTP
 */
export const verifyOTP = async (data: VerifyOtpInput) => {
    // Find user
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: data.emailOrPhone },
                { phoneNumber: data.emailOrPhone },
            ],
        },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Find valid OTP from database
    const otpRecord = await prisma.oTP.findFirst({
        where: {
            emailOrPhone: data.emailOrPhone,
            otp: data.otp,
            type: data.type,
            verified: false,
            expiresAt: {
                gt: new Date(), // Not expired
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
    }

    // Mark OTP as verified
    await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { verified: true },
    });

    // Update verification status
    const updateData = data.type === 'email'
        ? { isEmailVerified: true }
        : { isPhoneVerified: true };

    await prisma.user.update({
        where: { id: user.id },
        data: updateData,
    });

    return {
        message: 'Verification successful',
        verified: true,
    };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (data: RefreshTokenInput): Promise<TokenPair> => {
    // Verify refresh token
    const payload = verifyRefreshToken(data.refreshToken);

    // Find user and verify refresh token matches
    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
    });

    if (!user || user.refreshToken !== data.refreshToken) {
        throw new Error('Invalid refresh token');
    }

    // Generate new token pair
    const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
    });

    // Update refresh token
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
    });

    return tokens;
};

/**
 * Logout user
 */
export const logoutUser = async (userId: string) => {
    await prisma.user.update({
        where: { id: userId },
        data: {
            refreshToken: null,
            isOnline: false,
        },
    });

    return {
        message: 'Logged out successfully',
    };
};

/**
 * Forgot password - send reset token
 */
export const forgotPassword = async (data: ForgotPasswordInput) => {
    const user = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (!user) {
        // Don't reveal if user exists
        return {
            message: 'If the email exists, a reset link has been sent',
        };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: resetToken,
            passwordResetExpiry: resetTokenExpiry,
        },
    });

    // TODO: Send email with reset link
    console.log(`🔑 Password reset token for ${data.email}: ${resetToken}`);

    return {
        message: 'If the email exists, a reset link has been sent',
        // In production, don't return token
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    };
};

/**
 * Reset password
 */
export const resetPassword = async (data: ResetPasswordInput) => {
    // Find user with valid reset token
    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: data.token,
            passwordResetExpiry: {
                gt: new Date(),
            },
        },
    });

    if (!user) {
        throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await hashPassword(data.newPassword);

    // Update password and clear reset token
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            passwordResetToken: null,
            passwordResetExpiry: null,
        },
    });

    return {
        message: 'Password reset successful',
    };
};

/**
 * Check if user exists (email or phone)
 */
export const checkExistence = async (data: CheckExistenceInput) => {
    let emailExists = false;
    let phoneExists = false;

    if (data.email) {
        const count = await prisma.user.count({
            where: { email: data.email },
        });
        emailExists = count > 0;
    }

    if (data.phoneNumber) {
        const count = await prisma.user.count({
            where: { phoneNumber: data.phoneNumber },
        });
        phoneExists = count > 0;
    }

    return {
        emailExists,
        phoneExists,
    };
};
