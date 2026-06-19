import { Request, Response, NextFunction } from 'express';
import * as service from '../services/relationship.service';

const requireUser = (req: Request, res: Response): string | null => {
    const userId = req.user?.userId;
    if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return null;
    }
    return userId;
};

// ----- Saved ---------------------------------------------------------------

export const getSaved = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = requireUser(req, res);
        if (!userId) return;
        const users = await service.getSavedProfiles(userId);
        res.json({ success: true, data: { profiles: users, count: users.length } });
    } catch (e) {
        next(e);
    }
};

export const save = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = requireUser(req, res);
        if (!userId) return;
        await service.saveProfile(userId, String(req.params.targetUserId));
        res.json({ success: true, message: 'Saved' });
    } catch (e) {
        next(e);
    }
};

export const unsave = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = requireUser(req, res);
        if (!userId) return;
        const r = await service.unsaveProfile(userId, String(req.params.targetUserId));
        res.json({ success: true, message: r.message });
    } catch (e) {
        next(e);
    }
};

// ----- Hidden --------------------------------------------------------------

export const getHidden = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = requireUser(req, res);
        if (!userId) return;
        const users = await service.getHiddenProfiles(userId);
        res.json({ success: true, data: { profiles: users, count: users.length } });
    } catch (e) {
        next(e);
    }
};

export const hide = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = requireUser(req, res);
        if (!userId) return;
        await service.hideProfile(userId, String(req.params.targetUserId));
        res.json({ success: true, message: 'Profile hidden' });
    } catch (e) {
        next(e);
    }
};

export const unhide = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = requireUser(req, res);
        if (!userId) return;
        const r = await service.unhideProfile(userId, String(req.params.targetUserId));
        res.json({ success: true, message: r.message });
    } catch (e) {
        next(e);
    }
};

// ----- Blocked (list) ------------------------------------------------------

export const getBlocked = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = requireUser(req, res);
        if (!userId) return;
        const users = await service.getBlockedProfiles(userId);
        res.json({ success: true, data: { profiles: users, count: users.length } });
    } catch (e) {
        next(e);
    }
};
