import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../server';

// Helper to extract user ID from authenticated request
const getUserId = (req: Request): string => {
    const user = (req as any).user;
    if (!user || !user.userId) {
        throw new Error('User not authenticated');
    }
    return user.userId;
};

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await NotificationService.getUserNotifications(userId, page, limit);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;

        const notification = await NotificationService.markAsRead(id as string, userId);
        res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        await NotificationService.markAllAsRead(userId);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const count = await NotificationService.getUnreadCount(userId);
        res.json({ unreadCount: count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};

/** Save/refresh the caller's FCM device token (from the mobile app). */
export const saveDeviceToken = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const { token } = req.body ?? {};
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ success: false, message: 'token is required' });
        }
        await prisma.user.update({ where: { id: userId }, data: { deviceToken: token } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to save device token' });
    }
};

/** Clear the caller's FCM device token (on logout). */
export const removeDeviceToken = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        await prisma.user.update({ where: { id: userId }, data: { deviceToken: null } });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to remove device token' });
    }
};
