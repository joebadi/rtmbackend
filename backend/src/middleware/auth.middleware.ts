import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { prisma } from '../server';

/**
 * Extend Express Request to include user
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const payload = verifyAccessToken(token);

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                isEmailVerified: true,
                isPhoneVerified: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        // Attach user to request
        req.user = {
            userId: user.id,
            email: user.email,
        };

        next();
    } catch (error: any) {
        return res.status(401).json({
            success: false,
            message: error.message || 'Invalid token',
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
export const optionalAuthenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyAccessToken(token);

            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: {
                    id: true,
                    email: true,
                },
            });

            if (user) {
                req.user = {
                    userId: user.id,
                    email: user.email,
                };
            }
        }

        next();
    } catch (error) {
        // Continue without user
        next();
    }
};
