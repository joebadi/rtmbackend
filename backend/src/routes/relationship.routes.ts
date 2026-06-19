import { Router } from 'express';
import * as controller from '../controllers/relationship.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Saved profiles
router.get('/saved', authenticate, controller.getSaved);
router.post('/saved/:targetUserId', authenticate, controller.save);
router.delete('/saved/:targetUserId', authenticate, controller.unsave);

// Hidden profiles ("not interested" — removed from my feed)
router.get('/hidden', authenticate, controller.getHidden);
router.post('/hidden/:targetUserId', authenticate, controller.hide);
router.delete('/hidden/:targetUserId', authenticate, controller.unhide);

// Blocked profiles (list; block/unblock live under /messages/block)
router.get('/blocked', authenticate, controller.getBlocked);

export default router;
