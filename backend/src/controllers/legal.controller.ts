import { Request, Response, NextFunction } from 'express';
import * as service from '../services/legal.service';

/**
 * Public: fetch a legal document by slug (privacy_policy | terms_of_use).
 */
export const get = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;
        const document = await service.getDocument(slug as string);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found',
            });
        }

        res.json({ success: true, data: { document } });
    } catch (e) {
        next(e);
    }
};
