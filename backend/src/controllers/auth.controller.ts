import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import {
    registerSchema,
    loginSchema,
    sendOtpSchema,
    verifyOtpSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from '../validators/auth.validator';
import { calculatePasswordStrength, isCommonPassword } from '../utils/password.util';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const validatedData = registerSchema.parse(req.body);

        // Register user
        const result = await authService.registerUser(validatedData);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const validatedData = loginSchema.parse(req.body);

        // Login user
        const result = await authService.loginUser(validatedData);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Send OTP for verification
 */
export const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const validatedData = sendOtpSchema.parse(req.body);

        // Send OTP
        const result = await authService.sendOTP(validatedData);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Verify OTP
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const validatedData = verifyOtpSchema.parse(req.body);

        // Verify OTP
        const result = await authService.verifyOTP(validatedData);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const validatedData = refreshTokenSchema.parse(req.body);

        // Refresh token
        const tokens = await authService.refreshAccessToken(validatedData);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: { tokens },
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get user ID from authenticated request
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Logout user
        const result = await authService.logoutUser(userId);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Forgot password - send reset token
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const validatedData = forgotPasswordSchema.parse(req.body);

        // Send reset token
        const result = await authService.forgotPassword(validatedData);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Reset password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate input
        const validatedData = resetPasswordSchema.parse(req.body);

        // Reset password
        const result = await authService.resetPassword(validatedData);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Check password strength
 * Real-time password strength validation for UI
 */
export const checkPasswordStrength = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Password is required',
            });
        }

        // Calculate password strength
        const strength = calculatePasswordStrength(password);

        // Check if it's a common password
        const isCommon = isCommonPassword(password);
        if (isCommon) {
            strength.feedback.push('This is a commonly used password. Choose something more unique.');
            strength.score = Math.max(0, strength.score - 20);
        }

        res.status(200).json({
            success: true,
            data: {
                ...strength,
                isCommon,
            },
        });
    } catch (error) {
        next(error);
    }
};
