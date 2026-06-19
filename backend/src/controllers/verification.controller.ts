import { Request, Response, NextFunction } from 'express';
import * as service from '../services/verification.service';

export const get = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const verification = await service.getVerification(userId);
        res.json({ success: true, data: { verification } });
    } catch (e) {
        next(e);
    }
};

export const submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const files = req.files as
            | { [field: string]: Express.Multer.File[] }
            | undefined;
        const selfie = files?.selfie?.[0];
        const idDoc = files?.idDocument?.[0];

        if (!selfie || !idDoc) {
            return res.status(400).json({
                success: false,
                message: 'Both a selfie and an ID document are required',
            });
        }

        const verification = await service.submitVerification(
            userId,
            selfie.buffer,
            idDoc.buffer
        );

        res.status(201).json({
            success: true,
            message: 'Verification submitted for review',
            data: { verification },
        });
    } catch (e) {
        next(e);
    }
};
