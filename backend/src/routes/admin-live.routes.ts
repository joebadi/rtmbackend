import { Router } from 'express';
import * as liveController from '../controllers/live.controller';
import { authenticateAdmin, requireAdminOrAbove } from '../middleware/admin-auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// All admin Live Dates routes require an authenticated admin.
router.use(authenticateAdmin, requireAdminOrAbove);

/**
 * @route   POST /api/admin/live/upload-cover
 * @desc    Upload a cover image (multipart field "file"); returns { url }
 */
router.post('/upload-cover', upload.single('file'), liveController.adminUploadCover);

/**
 * @route   GET /api/admin/live/events
 * @desc    List all events (any status)
 */
router.get('/events', liveController.adminListEvents);

/**
 * @route   POST /api/admin/live/events
 * @desc    Create an event (DRAFT)
 */
router.post('/events', liveController.adminCreateEvent);

/**
 * @route   PUT /api/admin/live/events/:id
 * @desc    Update an event
 */
router.put('/events/:id', liveController.adminUpdateEvent);

/**
 * @route   POST /api/admin/live/events/:id/publish
 * @desc    Publish a draft event (DRAFT → SCHEDULED)
 */
router.post('/events/:id/publish', liveController.adminPublishEvent);

/**
 * @route   POST /api/admin/live/events/:id/cancel
 * @desc    Cancel an event and refund bookings
 */
router.post('/events/:id/cancel', liveController.adminCancelEvent);

/**
 * @route   GET /api/admin/live/events/:id/stats
 * @desc    Event stats (bookings, attendance, matches, revenue)
 */
router.get('/events/:id/stats', liveController.adminGetStats);

// ----- Realtime engine controls -----

/**
 * @route   POST /api/admin/live/events/:id/start
 * @desc    Start the event (LOBBY/LIVE) and run round 1
 */
router.post('/events/:id/start', liveController.adminStartEvent);

/**
 * @route   POST /api/admin/live/events/:id/next-round
 * @desc    Manually advance to the next round
 */
router.post('/events/:id/next-round', liveController.adminNextRound);

/**
 * @route   POST /api/admin/live/events/:id/end
 * @desc    End the event (→ POST_EVENT)
 */
router.post('/events/:id/end', liveController.adminEndEvent);

export default router;
