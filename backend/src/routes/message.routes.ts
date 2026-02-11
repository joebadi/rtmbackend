import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/messages/send
 * @desc    Send a message
 * @access  Private
 */
router.post('/send', authenticate, messageController.sendMessage);

/**
 * @route   GET /api/messages/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get('/conversations', authenticate, messageController.getConversations);

/**
 * @route   GET /api/messages/unread/count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread/count', authenticate, messageController.getUnreadCount);

/**
 * @route   GET /api/messages/search
 * @desc    Search messages
 * @access  Private
 */
router.get('/search', authenticate, messageController.searchMessages);

/**
 * @route   POST /api/messages/mark-read
 * @desc    Mark messages as read
 * @access  Private
 */
router.post('/mark-read', authenticate, messageController.markAsRead);

/**
 * @route   GET /api/messages/:conversationId
 * @desc    Get messages in a conversation
 * @access  Private (must be AFTER all specific GET routes)
 */
router.get('/:conversationId', authenticate, messageController.getMessages);

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:messageId', authenticate, messageController.deleteMessage);

/**
 * @route   POST /api/messages/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/block', authenticate, messageController.blockUser);

/**
 * @route   DELETE /api/messages/block/:blockedUserId
 * @desc    Unblock a user
 * @access  Private
 */
router.delete('/block/:blockedUserId', authenticate, messageController.unblockUser);

export default router;
