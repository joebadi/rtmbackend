import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import {
    adminLoginSchema,
    createAdminSchema,
    updateAdminSchema,
    banUserSchema,
    getUsersFilterSchema,
    reviewReportSchema,
    verifyPhotoSchema,
    analyticsDateRangeSchema,
} from '../validators/admin.validator';

/**
 * Admin login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = adminLoginSchema.parse(req.body);
        const result = await adminService.adminLogin(validatedData);

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
 * Create admin
 */
export const createAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const validatedData = createAdminSchema.parse(req.body);
        const admin = await adminService.createAdmin(adminId, validatedData);

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: { admin },
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
 * Get all admins
 */
export const getAllAdmins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const admins = await adminService.getAllAdmins();

        res.status(200).json({
            success: true,
            data: { admins },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update admin
 */
export const updateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { targetAdminId } = req.params;
        const validatedData = updateAdminSchema.parse(req.body);

        const admin = await adminService.updateAdmin(targetAdminId as string, adminId, validatedData);

        res.status(200).json({
            success: true,
            message: 'Admin updated successfully',
            data: { admin },
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
 * Delete admin
 */
export const deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { targetAdminId } = req.params;
        const result = await adminService.deleteAdmin(targetAdminId as string, adminId);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get users with filters
 */
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters = getUsersFilterSchema.parse({
            search: req.query.search,
            isPremium: req.query.isPremium === 'true' ? true : req.query.isPremium === 'false' ? false : undefined,
            isVerified: req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined,
            isBanned: req.query.isBanned === 'true' ? true : req.query.isBanned === 'false' ? false : undefined,
            gender: req.query.gender as any,
            limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
            offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        });

        const result = await adminService.getUsers(filters);

        res.status(200).json({
            success: true,
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
 * Get user details
 */
export const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;
        const user = await adminService.getUserDetails(userId as string);

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Ban user
 */
export const banUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const validatedData = banUserSchema.parse(req.body);
        const result = await adminService.banUser(adminId, validatedData);

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
 * Unban user
 */
export const unbanUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { userId } = req.params;
        const result = await adminService.unbanUser(adminId, userId as string);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete user account
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { userId } = req.params;
        const result = await adminService.deleteUserAccount(adminId, userId as string);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get reports
 */
export const getReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = req.query.status as string | undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        const result = await adminService.getReports(status, limit, offset);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Review report
 */
export const reviewReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const validatedData = reviewReportSchema.parse(req.body);
        const result = await adminService.reviewReport(adminId, validatedData);

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
 * Get unverified photos
 */
export const getUnverifiedPhotos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        const result = await adminService.getUnverifiedPhotos(limit, offset);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify photo
 */
export const verifyPhoto = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const validatedData = verifyPhotoSchema.parse(req.body);
        const result = await adminService.verifyPhoto(adminId, validatedData);

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
 * Get dashboard analytics
 */
export const getDashboardAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters = analyticsDateRangeSchema.parse({
            period: req.query.period || 'month',
        });

        const analytics = await adminService.getDashboardAnalytics(filters);

        res.status(200).json({
            success: true,
            data: analytics,
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
 * Get audit logs
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        const result = await adminService.getAuditLogs(limit, offset);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};
