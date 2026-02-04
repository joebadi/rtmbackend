import { Request, Response, NextFunction } from 'express';
import * as profileService from '../services/profile.service';
import {
    createProfileSchema,
    updateProfileSchema,
    privacySettingsSchema,
} from '../validators/profile.validator';

/**
 * Create profile
 */
export const createProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = createProfileSchema.parse(req.body);

        // Create profile
        const profile = await profileService.createProfile(userId, validatedData);

        res.status(201).json({
            success: true,
            message: 'Profile created successfully',
            data: { profile },
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
 * Get own profile
 */
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const profile = await profileService.getProfile(userId);

        res.status(200).json({
            success: true,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get profile by user ID
 */
export const getProfileById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const viewerUserId = req.user?.userId;

        const profile = await profileService.getProfileById(userId as string, viewerUserId);

        res.status(200).json({
            success: true,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = updateProfileSchema.parse(req.body);

        // Update profile
        const profile = await profileService.updateProfile(userId, validatedData);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: { profile },
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
 * Upload photo
 */
export const uploadPhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;

        const photo = await profileService.uploadPhoto(
            userId,
            req.file.buffer,
            req.file.originalname,
            isPrimary
        );

        res.status(201).json({
            success: true,
            message: 'Photo uploaded successfully',
            data: { photo },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete photo
 */
export const deletePhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { photoId } = req.params;

        const result = await profileService.deletePhoto(userId, photoId as string);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Set primary photo
 */
export const setPrimaryPhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { photoId } = req.params;

        const photo = await profileService.setPrimaryPhoto(userId, photoId as string);

        res.status(200).json({
            success: true,
            message: 'Primary photo updated',
            data: { photo },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update privacy settings
 */
export const updatePrivacySettings = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = privacySettingsSchema.parse(req.body);

        const profile = await profileService.updatePrivacySettings(userId, validatedData);

        res.status(200).json({
            success: true,
            message: 'Privacy settings updated',
            data: { profile },
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
 * Get profile statistics
 */
export const getProfileStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const stats = await profileService.getProfileStats(userId);

        res.status(200).json({
            success: true,
            data: { stats },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete account
 */
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const result = await profileService.deleteAccount(userId);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};
