import { Router } from 'express';
import * as matchController from '../controllers/match.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/matches/preferences
 * @desc    Create/Update match preferences
 * @access  Private
 */
router.post('/preferences', authenticate, matchController.setPreferences);

/**
 * @route   GET /api/matches/preferences
 * @desc    Get match preferences
 * @access  Private
 */
router.get('/preferences', authenticate, matchController.getPreferences);

/**
 * @route   GET /api/matches/explore
 * @desc    Get potential matches based on preferences
 * @access  Private
 */
router.get('/explore', authenticate, matchController.exploreMatches);

/**
 * @route   POST /api/matches/filter
 * @desc    Filter matches with custom criteria
 * @access  Private
 */
router.post('/filter', authenticate, matchController.filterMatches);

/**
 * @route   GET /api/matches/suggestions
 * @desc    Get smart match suggestions
 * @access  Private
 */
router.get('/suggestions', authenticate, matchController.getMatchSuggestions);

/**
 * @route   GET /api/matches/compatibility/:targetUserId
 * @desc    Get compatibility score with specific user
 * @access  Private
 */
router.get('/compatibility/:targetUserId', authenticate, matchController.getCompatibility);

/**
 * @route   POST /api/matches/nearby
 * @desc    Get nearby users (geolocation-based)
 * @access  Private
 */
router.post('/nearby', authenticate, matchController.getNearbyUsers);

export default router;
