import { prisma } from '../server';
import { getIO } from './socket.service';

export class NotificationService {
    static async createNotification(
        userId: string,
        type: string,
        title: string,
        body: string,
        data?: any
    ) {
        try {
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type: type as any, // Using 'any' since enum import might be tricky, Prisma handles it
                    title,
                    body,
                    data: data ?? {},
                },
            });

            // Try to emit real-time notification
            try {
                const io = getIO();
                io.to(userId).emit('notification', notification);
            } catch (socketError) {
                console.warn('Socket not initialized or failed to emit:', socketError);
            }

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    static async getUserNotifications(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId } }),
        ]);

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        // Enrich personal notifications with related user profile data
        const enrichedNotifications = await Promise.all(
            notifications.map(async (notification) => {
                const data = notification.data as any;
                if (data?.relatedUserId) {
                    try {
                        const relatedUser = await prisma.user.findUnique({
                            where: { id: data.relatedUserId },
                            select: {
                                id: true,
                                profile: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        dateOfBirth: true,
                                        photos: { take: 1, select: { url: true } },
                                    },
                                },
                            },
                        });
                        return { ...notification, relatedUser };
                    } catch {
                        return notification;
                    }
                }
                return notification;
            })
        );

        return {
            notifications: enrichedNotifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            unreadCount,
        };
    }

    static async markAsRead(notificationId: string, userId: string) {
        // Ensure the notification belongs to the user
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            throw new Error('Notification not found or unauthorized');
        }

        return prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true, readAt: new Date() },
        });
    }

    static async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }

    static async getUnreadCount(userId: string) {
        return prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
}
