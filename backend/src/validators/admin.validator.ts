import { z } from 'zod';

/**
 * Admin login validation schema
 */
export const adminLoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * Create admin validation schema
 */
export const createAdminSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

/**
 * Update admin validation schema
 */
export const updateAdminSchema = z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']).optional(),
    password: z.string().min(8).optional(),
});

export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

/**
 * User management validation schemas
 */
export const banUserSchema = z.object({
    userId: z.string().uuid(),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
    duration: z.number().min(1).optional(), // days, undefined = permanent
});

export type BanUserInput = z.infer<typeof banUserSchema>;

export const getUsersFilterSchema = z.object({
    search: z.string().optional(),
    isPremium: z.boolean().optional(),
    isVerified: z.boolean().optional(),
    isBanned: z.boolean().optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
});

export type GetUsersFilterInput = z.infer<typeof getUsersFilterSchema>;

/**
 * Report management validation schemas
 */
export const reviewReportSchema = z.object({
    reportId: z.string().uuid(),
    status: z.enum(['REVIEWED', 'RESOLVED']),
    reviewNotes: z.string().optional(),
    action: z.enum(['NO_ACTION', 'WARNING', 'BAN_USER', 'DELETE_CONTENT']).optional(),
});

export type ReviewReportInput = z.infer<typeof reviewReportSchema>;

/**
 * Photo verification validation schema
 */
export const verifyPhotoSchema = z.object({
    photoId: z.string().uuid(),
    isVerified: z.boolean(),
    reason: z.string().optional(),
});

export type VerifyPhotoInput = z.infer<typeof verifyPhotoSchema>;

/**
 * Analytics date range validation schema
 */
export const analyticsDateRangeSchema = z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    period: z.enum(['today', 'week', 'month', 'year', 'all']).default('month'),
});

export type AnalyticsDateRangeInput = z.infer<typeof analyticsDateRangeSchema>;
