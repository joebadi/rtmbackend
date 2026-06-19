import { Request, Response } from 'express';
import * as liveService from '../services/live.service';
import * as agoraService from '../services/agora.service';
import * as liveEngine from '../services/live-engine.service';
import { createEventSchema, updateEventSchema } from '../validators/live.validator';

const unauthorized = (res: Response) =>
    res.status(401).json({ success: false, message: 'Unauthorized' });

/** Map common service errors to HTTP responses. */
const handleError = (res: Response, error: any) => {
    if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error.errors });
    }
    if (error.code === 'INSUFFICIENT_DIAMONDS') {
        return res.status(402).json({
            success: false,
            code: 'INSUFFICIENT_DIAMONDS',
            message: 'You need more diamonds for this',
            data: { required: error.required, balance: error.balance },
        });
    }
    return res.status(400).json({ success: false, message: error.message || 'Something went wrong' });
};

// ============================================
// USER-FACING
// ============================================

export const listEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const events = await liveService.listEvents(userId);
        res.status(200).json({ success: true, data: { events, count: events.length } });
    } catch (error) {
        handleError(res, error);
    }
};

export const getEvent = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const event = await liveService.getEvent(userId, req.params.id as string);
        res.status(200).json({ success: true, data: { event } });
    } catch (error) {
        handleError(res, error);
    }
};

export const bookEvent = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const booking = await liveService.bookEvent(userId, req.params.id as string);
        res.status(200).json({ success: true, message: 'Booking confirmed', data: { booking } });
    } catch (error) {
        handleError(res, error);
    }
};

export const cancelBooking = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const result = await liveService.cancelBooking(userId, req.params.id as string);
        res.status(200).json({ success: true, message: 'Booking cancelled', data: result });
    } catch (error) {
        handleError(res, error);
    }
};

/**
 * Mint an Agora RTC token for the authenticated user to join a channel.
 *
 * Phase: RTC plumbing / manual 1:1 test calls. When the round scheduler lands,
 * this will be replaced by a pairing-scoped token endpoint that only issues a
 * token to the two users in an active LivePairing.
 */
export const getRtcToken = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);

        const channelName = (req.body?.channelName ?? '').toString().trim();
        if (!channelName) {
            return res.status(400).json({ success: false, message: 'channelName is required' });
        }

        const uid = agoraService.uidFromUserId(userId);
        const result = agoraService.generateRtcToken(channelName, uid);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        if (error.code === 'AGORA_NOT_CONFIGURED') {
            return res.status(503).json({
                success: false,
                code: 'AGORA_NOT_CONFIGURED',
                message: error.message,
            });
        }
        handleError(res, error);
    }
};

// ----- Realtime lobby / rounds (participant) -----

export const joinLobby = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const result = await liveEngine.joinLobby(userId, req.params.id as string);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        handleError(res, error);
    }
};

export const getEventState = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const state = await liveEngine.getEventState(userId, req.params.id as string);
        res.status(200).json({ success: true, data: state });
    } catch (error) {
        handleError(res, error);
    }
};

export const getPairingToken = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const result = await liveEngine.getPairingToken(userId, req.params.pairingId as string);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        if (error.code === 'AGORA_NOT_CONFIGURED') {
            return res.status(503).json({ success: false, code: 'AGORA_NOT_CONFIGURED', message: error.message });
        }
        handleError(res, error);
    }
};

export const recordInterest = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const interested = req.body?.interested === true;
        const result = await liveEngine.recordInterest(userId, req.params.pairingId as string, interested);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        handleError(res, error);
    }
};

export const ratePairing = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const rating = Number(req.body?.rating);
        if (!(rating >= 1 && rating <= 5)) {
            return res.status(400).json({ success: false, message: 'rating must be 1-5' });
        }
        const result = await liveEngine.ratePairing(userId, req.params.pairingId as string, rating);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        handleError(res, error);
    }
};

/** Reveal a blind-date partner (free up to the event's quota, then diamonds). */
export const unveilPartner = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const result = await liveEngine.unveilPartner(userId, req.params.pairingId as string);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        handleError(res, error);
    }
};

/** Post-event results: matches, ratings, and unveil state. */
export const getEventResults = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);
        const result = await liveEngine.getEventResults(userId, req.params.id as string);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        handleError(res, error);
    }
};

// ============================================
// ADMIN
// ============================================

export const adminStartEvent = async (req: Request, res: Response) => {
    try {
        const result = await liveEngine.startEvent(req.params.id as string);
        res.status(200).json({ success: true, message: 'Event started', data: result });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminNextRound = async (req: Request, res: Response) => {
    try {
        const result = await liveEngine.runNextRound(req.params.id as string);
        res.status(200).json({ success: true, message: 'Advanced round', data: result });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminEndEvent = async (req: Request, res: Response) => {
    try {
        const result = await liveEngine.endEvent(req.params.id as string);
        res.status(200).json({ success: true, message: 'Event ended', data: result });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminListEvents = async (_req: Request, res: Response) => {
    try {
        const events = await liveService.adminListEvents();
        res.status(200).json({ success: true, data: { events, count: events.length } });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminCreateEvent = async (req: Request, res: Response) => {
    try {
        const adminId = req.admin?.adminId;
        if (!adminId) return unauthorized(res);
        const data = createEventSchema.parse(req.body);
        const event = await liveService.adminCreateEvent(adminId, data);
        res.status(201).json({ success: true, message: 'Event created', data: { event } });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminUpdateEvent = async (req: Request, res: Response) => {
    try {
        const data = updateEventSchema.parse(req.body);
        const event = await liveService.adminUpdateEvent(req.params.id as string, data);
        res.status(200).json({ success: true, message: 'Event updated', data: { event } });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminPublishEvent = async (req: Request, res: Response) => {
    try {
        const event = await liveService.adminPublishEvent(req.params.id as string);
        res.status(200).json({ success: true, message: 'Event published', data: { event } });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminCancelEvent = async (req: Request, res: Response) => {
    try {
        const event = await liveService.adminCancelEvent(req.params.id as string);
        res.status(200).json({ success: true, message: 'Event cancelled', data: { event } });
    } catch (error) {
        handleError(res, error);
    }
};

export const adminGetStats = async (req: Request, res: Response) => {
    try {
        const stats = await liveService.adminGetStats(req.params.id as string);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        handleError(res, error);
    }
};
