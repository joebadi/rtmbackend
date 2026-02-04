import { Request, Response, NextFunction } from 'express';
import * as likeService from '../services/like.service';
import { sendLikeSchema } from '../validators/like.validator';

/**
 * Send a like
 */
export const sendLike = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = sendLikeSchema.parse(req.body);

        const result = await likeService.sendLike(userId, validatedData);

        res.status(201).json({
            success: true,
            message: result.message,
            data: {
                like: result.like,
                isMutual: result.isMutual,
            },
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
 * Unlike a user
 */
export const unlikeUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { likedUserId } = req.params;

        const result = await likeService.unlikeUser(userId, likedUserId as string);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get sent likes
 */
export const getSentLikes = async (req: Request, res: Response, next: NextFunction) => {
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

        const likes = await likeService.getSentLikes(userId, limit, offset);

        res.status(200).json({
            success: true,
            data: {
                likes,
                count: likes.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get received likes
 */
export const getReceivedLikes = async (req: Request, res: Response, next: NextFunction) => {
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

        const likes = await likeService.getReceivedLikes(userId, limit, offset);

        res.status(200).json({
            success: true,
            data: {
                likes,
                count: likes.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get mutual likes (matches)
 */
export const getMutualLikes = async (req: Request, res: Response, next: NextFunction) => {
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

        const likes = await likeService.getMutualLikes(userId, limit, offset);

        res.status(200).json({
            success: true,
            data: {
                matches: likes,
                count: likes.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Check if liked a user
 */
export const checkIfLiked = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { targetUserId } = req.params;

        const result = await likeService.checkIfLiked(userId, targetUserId as string);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get like statistics
 */
export const getLikeStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const stats = await likeService.getLikeStats(userId);

        res.status(200).json({
            success: true,
            data: { stats },
        });
    } catch (error) {
        next(error);
    }
};
