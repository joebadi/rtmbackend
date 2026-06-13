import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import { DIAMOND_PACKAGES } from '../config/diamonds.config';

const unauthorized = (res: Response) =>
    res.status(401).json({ success: false, message: 'Unauthorized' });

/**
 * GET /api/payments/wallet
 * Current diamond balance + purchasable packages.
 */
export const getWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);

        const wallet = await paymentService.getWallet(userId);
        res.status(200).json({ success: true, data: wallet });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/payments/packages
 * Static catalogue of diamond packages (no auth needed to view pricing).
 */
export const getPackages = async (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { packages: DIAMOND_PACKAGES } });
};

/**
 * POST /api/payments/initialize  { packageId }
 * Begin a diamond purchase; returns a Paystack authorization URL.
 */
export const initializePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);

        const { packageId } = req.body;
        if (!packageId) {
            return res.status(400).json({ success: false, message: 'packageId is required' });
        }

        const result = await paymentService.initializeDiamondPurchase(userId, packageId);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        if (error.code === 'PAYMENT_NOT_CONFIGURED') {
            return res.status(503).json({
                success: false,
                code: 'PAYMENT_NOT_CONFIGURED',
                message: error.message,
            });
        }
        return res.status(400).json({ success: false, message: error.message || 'Failed to initialize payment' });
    }
};

/**
 * GET /api/payments/verify/:reference  (or ?reference=)
 * Verify a payment and grant diamonds.
 */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);

        const reference = (req.params.reference || req.query.reference) as string;
        if (!reference) {
            return res.status(400).json({ success: false, message: 'reference is required' });
        }

        const result = await paymentService.verifyDiamondPurchase(userId, reference);
        res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        if (error.code === 'PAYMENT_NOT_CONFIGURED') {
            return res.status(503).json({
                success: false,
                code: 'PAYMENT_NOT_CONFIGURED',
                message: error.message,
            });
        }
        return res.status(400).json({ success: false, message: error.message || 'Verification failed' });
    }
};

/**
 * GET /api/payments/transactions
 * The user's purchase history.
 */
export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return unauthorized(res);

        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const transactions = await paymentService.listTransactions(userId, limit, offset);
        res.status(200).json({ success: true, data: { transactions, count: transactions.length } });
    } catch (error) {
        next(error);
    }
};
