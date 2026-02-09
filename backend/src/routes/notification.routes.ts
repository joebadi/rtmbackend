import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as NotificationController from '../controllers/notification.controller';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);

export default router;
