import { Request, Response, NextFunction } from 'express';
import * as preferencesService from '../services/preferences.service';

/**
 * Save or update match preferences
 */
export const savePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const preferences = await preferencesService.saveMatchPreferences(userId, req.body);

        res.status(200).json({
            success: true,
            message: 'Match preferences saved successfully',
            data: { preferences },
        });
    } catch (error) {
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

        const preferences = await preferencesService.getMatchPreferences(userId);

        res.status(200).json({
            success: true,
            data: { preferences },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete match preferences
 */
export const deletePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const result = await preferencesService.deleteMatchPreferences(userId);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};
