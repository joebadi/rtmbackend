import { prisma } from '../server';
import bcrypt from 'bcryptjs';
import { generateAdminToken } from '../utils/admin-jwt.util';
import {
    AdminLoginInput,
    CreateAdminInput,
    UpdateAdminInput,
    BanUserInput,
    GetUsersFilterInput,
    ReviewReportInput,
    VerifyPhotoInput,
    AnalyticsDateRangeInput,
} from '../validators/admin.validator';
import { Prisma } from '@prisma/client';

/**
 * Admin login
 */
export const adminLogin = async (data: AdminLoginInput) => {
    const { email, password } = data;

    // Find admin
    const admin = await prisma.adminUser.findUnique({
        where: { email },
    });

    if (!admin) {
        throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateAdminToken({
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
    });

    // Log admin login
    await prisma.auditLog.create({
        data: {
            adminId: admin.id,
            action: 'ADMIN_LOGIN',
            details: { email },
        },
    });

    return {
        admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
        },
        token,
    };
};

/**
 * Create admin user (Super Admin only)
 */
export const createAdmin = async (creatorId: string, data: CreateAdminInput) => {
    const { email, password, name, role } = data;

    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findUnique({
        where: { email },
    });

    if (existingAdmin) {
        throw new Error('Admin with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.adminUser.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role,
        },
    });

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId: creatorId,
            action: 'CREATE_ADMIN',
            targetType: 'AdminUser',
            targetId: admin.id,
            details: { email, role },
        },
    });

    return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
    };
};

/**
 * Get all admins
 */
export const getAllAdmins = async () => {
    const admins = await prisma.adminUser.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return admins;
};

/**
 * Update admin
 */
export const updateAdmin = async (
    adminId: string,
    updaterId: string,
    data: UpdateAdminInput
) => {
    const updates: any = {};

    if (data.name) updates.name = data.name;
    if (data.role) updates.role = data.role;
    if (data.password) {
        updates.password = await bcrypt.hash(data.password, 10);
    }

    const admin = await prisma.adminUser.update({
        where: { id: adminId },
        data: updates,
    });

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId: updaterId,
            action: 'UPDATE_ADMIN',
            targetType: 'AdminUser',
            targetId: adminId,
            details: data,
        },
    });

    return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
    };
};

/**
 * Delete admin
 */
export const deleteAdmin = async (adminId: string, deleterId: string) => {
    await prisma.adminUser.delete({
        where: { id: adminId },
    });

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId: deleterId,
            action: 'DELETE_ADMIN',
            targetType: 'AdminUser',
            targetId: adminId,
        },
    });

    return { message: 'Admin deleted successfully' };
};

/**
 * Get all users with filters
 */
export const getUsers = async (filters: GetUsersFilterInput) => {
    const where: Prisma.UserWhereInput = {};

    // Search filter
    if (filters.search) {
        where.OR = [
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phoneNumber: { contains: filters.search } },
            {
                profile: {
                    OR: [
                        { firstName: { contains: filters.search, mode: 'insensitive' } },
                        { lastName: { contains: filters.search, mode: 'insensitive' } },
                    ],
                },
            },
        ];
    }

    // Premium filter
    if (filters.isPremium !== undefined) {
        where.isPremium = filters.isPremium;
    }

    // Verified filter
    if (filters.isVerified !== undefined) {
        where.isEmailVerified = filters.isVerified;
    }

    // Banned filter
    if (filters.isBanned !== undefined) {
        if (!where.profile) {
            where.profile = {};
        }
        (where.profile as any).isBanned = filters.isBanned;
    }

    // Gender filter
    if (filters.gender) {
        if (!where.profile) {
            where.profile = {};
        }
        (where.profile as any).gender = filters.gender;
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        age: true,
                        gender: true,
                        city: true,
                        country: true,
                        isBanned: true,
                        bannedReason: true,
                        photos: {
                            where: { isPrimary: true },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: filters.limit,
            skip: filters.offset,
        }),
        prisma.user.count({ where }),
    ]);

    return { users, total };
};

/**
 * Get user details
 */
export const getUserDetails = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: {
                include: {
                    photos: true,
                },
            },
            matchPreferences: true,
            sentLikes: {
                take: 10,
                orderBy: { createdAt: 'desc' },
            },
            receivedLikes: {
                take: 10,
                orderBy: { createdAt: 'desc' },
            },
            transactions: {
                take: 10,
                orderBy: { createdAt: 'desc' },
            },
            reports: {
                take: 10,
                orderBy: { createdAt: 'desc' },
            },
            reportedBy: {
                take: 10,
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!user) {
        throw new Error('User not found');
    }

    return user;
};

/**
 * Ban user
 */
export const banUser = async (adminId: string, data: BanUserInput) => {
    const { userId, reason, duration } = data;

    const bannedUntil = duration
        ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
        : undefined;

    await prisma.profile.update({
        where: { userId },
        data: {
            isBanned: true,
            bannedReason: reason,
            bannedUntil,
        },
    });

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId,
            action: 'BAN_USER',
            targetType: 'User',
            targetId: userId,
            details: { reason, duration },
        },
    });

    // Notify user
    await prisma.notification.create({
        data: {
            userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Account Suspended',
            body: `Your account has been suspended. Reason: ${reason}`,
        },
    });

    return { message: 'User banned successfully' };
};

/**
 * Unban user
 */
export const unbanUser = async (adminId: string, userId: string) => {
    await prisma.profile.update({
        where: { userId },
        data: {
            isBanned: false,
            bannedReason: null,
            bannedUntil: null,
        },
    });

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId,
            action: 'UNBAN_USER',
            targetType: 'User',
            targetId: userId,
        },
    });

    // Notify user
    await prisma.notification.create({
        data: {
            userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Account Restored',
            body: 'Your account has been restored. Welcome back!',
        },
    });

    return { message: 'User unbanned successfully' };
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (adminId: string, userId: string) => {
    await prisma.user.delete({
        where: { id: userId },
    });

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId,
            action: 'DELETE_USER',
            targetType: 'User',
            targetId: userId,
        },
    });

    return { message: 'User account deleted successfully' };
};

/**
 * Get all reports
 */
export const getReports = async (status?: string, limit: number = 20, offset: number = 0) => {
    const where: Prisma.ReportWhereInput = status ? { status: status as any } : {};

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            include: {
                reporter: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                reportedUser: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                photos: {
                                    where: { isPrimary: true },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.report.count({ where }),
    ]);

    return { reports, total };
};

/**
 * Review report
 */
export const reviewReport = async (adminId: string, data: ReviewReportInput) => {
    const { reportId, status, reviewNotes, action } = data;

    // Update report
    await prisma.report.update({
        where: { id: reportId },
        data: {
            status,
            reviewedBy: adminId,
            reviewNotes,
            resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
        },
    });

    // Take action if specified
    if (action && action !== 'NO_ACTION') {
        const report = await prisma.report.findUnique({
            where: { id: reportId },
        });

        if (report) {
            switch (action) {
                case 'BAN_USER':
                    await banUser(adminId, {
                        userId: report.reportedUserId,
                        reason: `Reported for: ${report.reason}`,
                        duration: 7, // 7 days
                    });
                    break;
                case 'DELETE_CONTENT':
                    // Delete reported user's photos
                    await prisma.photo.deleteMany({
                        where: {
                            profile: { userId: report.reportedUserId },
                        },
                    });
                    break;
            }
        }
    }

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId,
            action: 'REVIEW_REPORT',
            targetType: 'Report',
            targetId: reportId,
            details: { status, action },
        },
    });

    return { message: 'Report reviewed successfully' };
};

/**
 * Get unverified photos
 */
export const getUnverifiedPhotos = async (limit: number = 20, offset: number = 0) => {
    const [photos, total] = await Promise.all([
        prisma.photo.findMany({
            where: { isVerified: false },
            include: {
                profile: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { uploadedAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.photo.count({ where: { isVerified: false } }),
    ]);

    return { photos, total };
};

/**
 * Verify photo
 */
export const verifyPhoto = async (adminId: string, data: VerifyPhotoInput) => {
    const { photoId, isVerified, reason } = data;

    await prisma.photo.update({
        where: { id: photoId },
        data: { isVerified },
    });

    // If rejected, notify user
    if (!isVerified) {
        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            include: { profile: true },
        });

        if (photo) {
            await prisma.notification.create({
                data: {
                    userId: photo.profile.userId,
                    type: 'VERIFICATION_REJECTED',
                    title: 'Photo Rejected',
                    body: reason || 'Your photo did not meet our guidelines.',
                },
            });

            // Delete rejected photo
            await prisma.photo.delete({
                where: { id: photoId },
            });
        }
    }

    // Log action
    await prisma.auditLog.create({
        data: {
            adminId,
            action: isVerified ? 'APPROVE_PHOTO' : 'REJECT_PHOTO',
            targetType: 'Photo',
            targetId: photoId,
            details: { reason },
        },
    });

    return { message: `Photo ${isVerified ? 'approved' : 'rejected'} successfully` };
};

/**
 * Get dashboard analytics
 */
export const getDashboardAnalytics = async (filters: AnalyticsDateRangeInput) => {
    const { period } = filters;

    // Calculate date range
    let startDate = new Date();
    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case 'all':
            startDate = new Date(0);
            break;
    }

    const [
        totalUsers,
        activeUsers,
        premiumUsers,
        newUsers,
        totalMatches,
        totalMessages,
        totalRevenue,
        pendingReports,
        unverifiedPhotos,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isOnline: true } }),
        prisma.user.count({ where: { isPremium: true } }),
        prisma.user.count({ where: { createdAt: { gte: startDate } } }),
        prisma.like.count({ where: { isMutual: true } }),
        prisma.message.count({ where: { createdAt: { gte: startDate } } }),
        prisma.transaction.aggregate({
            where: {
                status: 'COMPLETED',
                createdAt: { gte: startDate },
            },
            _sum: { amount: true },
        }),
        prisma.report.count({ where: { status: 'PENDING' } }),
        prisma.photo.count({ where: { isVerified: false } }),
    ]);

    // Get user growth data (last 30 days)
    const userGrowth = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*) as count
    FROM users
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

    // Get revenue data (last 12 months)
    const revenueData = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      SUM(amount) as revenue
    FROM transactions
    WHERE status = 'COMPLETED'
      AND "createdAt" >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY month ASC
  `;

    // Convert BigInt to Number for JSON serialization
    const userGrowthFormatted = userGrowth.map(row => ({
        date: row.date,
        count: Number(row.count),
    }));

    const revenueDataFormatted = revenueData.map(row => ({
        month: row.month,
        revenue: Number(row.revenue || 0),
    }));

    return {
        overview: {
            totalUsers: Number(totalUsers),
            activeUsers: Number(activeUsers),
            premiumUsers: Number(premiumUsers),
            newUsers: Number(newUsers),
            totalMatches: Number(totalMatches),
            totalMessages: Number(totalMessages),
            totalRevenue: Number(totalRevenue._sum.amount || 0),
            pendingReports: Number(pendingReports),
            unverifiedPhotos: Number(unverifiedPhotos),
        },
        charts: {
            userGrowth: userGrowthFormatted,
            revenueData: revenueDataFormatted,
        },
    };
};

/**
 * Get audit logs
 */
export const getAuditLogs = async (limit: number = 50, offset: number = 0) => {
    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            include: {
                admin: {
                    select: {
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.auditLog.count(),
    ]);

    return { logs, total };
};
