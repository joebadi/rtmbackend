import { Router } from 'express';
import * as likeController from '../controllers/like.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/likes/send
 * @desc    Send a like to another user
 * @access  Private
 */
router.post('/send', authenticate, likeController.sendLike);

/**
 * @route   DELETE /api/likes/:likedUserId
 * @desc    Unlike a user
 * @access  Private
 */
router.delete('/:likedUserId', authenticate, likeController.unlikeUser);

/**
 * @route   GET /api/likes/sent
 * @desc    Get likes sent by user
 * @access  Private
 */
router.get('/sent', authenticate, likeController.getSentLikes);

/**
 * @route   GET /api/likes/received
 * @desc    Get likes received by user
 * @access  Private
 */
router.get('/received', authenticate, likeController.getReceivedLikes);

/**
 * @route   GET /api/likes/mutual
 * @desc    Get mutual likes (matches)
 * @access  Private
 */
router.get('/mutual', authenticate, likeController.getMutualLikes);

/**
 * @route   GET /api/likes/stats
 * @desc    Get like statistics
 * @access  Private
 */
router.get('/stats', authenticate, likeController.getLikeStats);

/**
 * @route   GET /api/likes/check/:targetUserId
 * @desc    Check if user has liked another user
 * @access  Private
 */
router.get('/check/:targetUserId', authenticate, likeController.checkIfLiked);

export default router;
