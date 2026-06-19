import { Router } from 'express';
import * as liveController from '../controllers/live.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/live/events
 * @desc    List upcoming + live events (with my booking status)
 * @access  Private
 */
router.get('/events', authenticate, liveController.listEvents);

/**
 * @route   GET /api/live/events/:id
 * @desc    Event detail
 * @access  Private
 */
router.get('/events/:id', authenticate, liveController.getEvent);

/**
 * @route   POST /api/live/events/:id/book
 * @desc    Book a slot (charges diamonds; waitlist when full)
 * @access  Private
 */
router.post('/events/:id/book', authenticate, liveController.bookEvent);

/**
 * @route   DELETE /api/live/events/:id/book
 * @desc    Cancel a booking (refund if before start)
 * @access  Private
 */
router.delete('/events/:id/book', authenticate, liveController.cancelBooking);

/**
 * @route   POST /api/live/rtc/token   { channelName }
 * @desc    Mint a generic Agora RTC token (test/manual call)
 * @access  Private
 */
router.post('/rtc/token', authenticate, liveController.getRtcToken);

// ----- Realtime lobby / rounds -----

/**
 * @route   POST /api/live/events/:id/lobby
 * @desc    Mark yourself present in the lobby
 */
router.post('/events/:id/lobby', authenticate, liveController.joinLobby);

/**
 * @route   GET /api/live/events/:id/state
 * @desc    Current round + my active pairing (or null if sitting out)
 */
router.get('/events/:id/state', authenticate, liveController.getEventState);

/**
 * @route   GET /api/live/events/:id/results
 * @desc    Post-event results: who I met, matches, ratings, unveil state
 */
router.get('/events/:id/results', authenticate, liveController.getEventResults);

/**
 * @route   POST /api/live/pairings/:pairingId/unveil
 * @desc    Reveal a blind-date partner (free quota then diamonds)
 */
router.post('/pairings/:pairingId/unveil', authenticate, liveController.unveilPartner);

/**
 * @route   POST /api/live/pairings/:pairingId/token
 * @desc    Agora token bound to my active pairing's channel
 */
router.post('/pairings/:pairingId/token', authenticate, liveController.getPairingToken);

/**
 * @route   POST /api/live/pairings/:pairingId/interest   { interested }
 * @desc    Privately signal interest (mutual = match)
 */
router.post('/pairings/:pairingId/interest', authenticate, liveController.recordInterest);

/**
 * @route   POST /api/live/pairings/:pairingId/rate   { rating }
 * @desc    Rate a date (1-5)
 */
router.post('/pairings/:pairingId/rate', authenticate, liveController.ratePairing);

export default router;
