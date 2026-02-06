import { z } from 'zod';

/**
 * Register validation schema
 */
export const registerSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    dateOfBirth: z.string().optional(), // Optional during registration, can be added later
    // Accept both string (Flutter: "Male"/"Female") and enum ("MALE"/"FEMALE")
    gender: z.union([
        z.enum(['MALE', 'FEMALE']),
        z.string().transform((val) => val.toUpperCase() as 'MALE' | 'FEMALE')
    ]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login validation schema
 */
export const loginSchema = z.object({
    emailOrPhone: z.string().min(1, 'Email or phone number is required'),
    password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Send OTP validation schema
 */
export const sendOtpSchema = z.object({
    emailOrPhone: z.string().min(1, 'Email or phone number is required'),
    type: z.enum(['email', 'phone']),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;

/**
 * Verify OTP validation schema
 */
export const verifyOtpSchema = z.object({
    emailOrPhone: z.string().min(1, 'Email or phone number is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    type: z.enum(['email', 'phone']),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Check existence validation schema
 */
export const checkExistenceSchema = z.object({
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
}).refine(data => data.email || data.phoneNumber, {
    message: "Either email or phone number must be provided"
});

export type CheckExistenceInput = z.infer<typeof checkExistenceSchema>;
