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

// FCM device token registration (mobile push)
router.post('/device-token', NotificationController.saveDeviceToken);
router.delete('/device-token', NotificationController.removeDeviceToken);

export default router;
