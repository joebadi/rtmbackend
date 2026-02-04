import { Request, Response, NextFunction } from 'express';
import * as matchService from '../services/match.service';
import {
    matchPreferencesSchema,
    filterMatchesSchema,
    nearbyUsersSchema,
} from '../validators/match.validator';

/**
 * Create/Update match preferences
 */
export const setPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = matchPreferencesSchema.parse(req.body);

        // Set preferences
        const preferences = await matchService.setMatchPreferences(userId, validatedData);

        res.status(200).json({
            success: true,
            message: 'Match preferences saved successfully',
            data: { preferences },
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
 * Get match preferences
 */
export const getPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const preferences = await matchService.getMatchPreferences(userId);

        res.status(200).json({
            success: true,
            data: { preferences },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get potential matches
 */
export const exploreMatches = async (req: Request, res: Response, next: NextFunction) => {
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

        const matches = await matchService.getMatches(userId, limit, offset);

        res.status(200).json({
            success: true,
            data: {
                matches,
                count: matches.length,
                limit,
                offset,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Filter matches with custom criteria
 */
export const filterMatches = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = filterMatchesSchema.parse(req.body);

        const matches = await matchService.filterMatches(userId, validatedData);

        res.status(200).json({
            success: true,
            data: {
                matches,
                count: matches.length,
                filters: validatedData,
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
 * Get compatibility score with a specific user
 */
export const getCompatibility = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { targetUserId } = req.params;

        const compatibility = await matchService.calculateCompatibility(
            userId,
            targetUserId as string
        );

        res.status(200).json({
            success: true,
            data: { compatibility },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get match suggestions
 */
export const getMatchSuggestions = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const limit = parseInt(req.query.limit as string) || 10;

        const suggestions = await matchService.getMatchSuggestions(userId, limit);

        res.status(200).json({
            success: true,
            data: {
                suggestions,
                count: suggestions.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get nearby users (geolocation-based)
 */
export const getNearbyUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // Validate input
        const validatedData = nearbyUsersSchema.parse(req.body);

        const nearbyUsers = await matchService.getNearbyUsers(userId, validatedData);

        res.status(200).json({
            success: true,
            data: {
                users: nearbyUsers,
                count: nearbyUsers.length,
                radius: validatedData.radius,
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
