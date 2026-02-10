import { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service';
import {
    sendMessageSchema,
    markAsReadSchema,
    deleteMessageSchema,
} from '../validators/message.validator';

/**
 * Send a message
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        console.log('[Controller] sendMessage - userId:', userId, 'body:', req.body);

        // Validate input
        const validatedData = sendMessageSchema.parse(req.body);

        console.log('[Controller] Validated data:', validatedData);

        const message = await messageService.sendMessage(userId, validatedData);

        console.log('[Controller] Message sent successfully');

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { message },
        });
    } catch (error: any) {
        console.error('[Controller] Error in sendMessage:', error);

        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }

        // Handle match-required icebreaker limit error
        if (error.message && error.message.includes('need to match')) {
            return res.status(403).json({
                success: false,
                code: 'MATCH_REQUIRED',
                message: error.message,
            });
        }

        // Return error response instead of calling next
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send message',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
};

/**
 * Get conversations
 */
export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const conversations = await messageService.getConversations(userId, limit, offset);

        res.status(200).json({
            success: true,
            data: {
                conversations,
                count: conversations.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get messages in a conversation
 */
export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { conversationId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const messages = await messageService.getMessages(
            userId,
            conversationId as string,
            limit,
            offset
        );

        res.status(200).json({
            success: true,
            data: {
                messages,
                count: messages.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark messages as read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = markAsReadSchema.parse(req.body);

        const result = await messageService.markAsRead(userId, validatedData.conversationId);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        next(error);
    }
};

/**
 * Delete a message
 */
export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { messageId } = req.params;
        const { deleteForEveryone } = req.body;

        const result = await messageService.deleteMessage(
            userId,
            messageId as string,
            deleteForEveryone
        );

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const result = await messageService.getUnreadCount(userId);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Search messages
 */
export const searchMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const query = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required',
            });
        }

        const messages = await messageService.searchMessages(userId, query, limit);

        res.status(200).json({
            success: true,
            data: {
                messages,
                count: messages.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Block user
 */
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { blockedUserId } = req.body;

        const result = await messageService.blockUser(userId, blockedUserId);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unblock user
 */
export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { blockedUserId } = req.params;

        const result = await messageService.unblockUser(userId, blockedUserId as string);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};
