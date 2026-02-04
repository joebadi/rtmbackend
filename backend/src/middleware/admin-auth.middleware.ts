import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../utils/admin-jwt.util';
import { prisma } from '../server';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            admin?: {
                adminId: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Admin authentication middleware
 */
export const authenticateAdmin = async (
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
                message: 'No admin token provided',
            });
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = verifyAdminToken(token);

        // Check if admin exists
        const admin = await prisma.adminUser.findUnique({
            where: { id: decoded.adminId },
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Admin not found',
            });
        }

        // Attach admin info to request
        req.admin = {
            adminId: admin.id,
            email: admin.email,
            role: admin.role,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired admin token',
        });
    }
};

/**
 * Role-based authorization middleware
 */
export const authorizeAdmin = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
            });
        }

        next();
    };
};

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = authorizeAdmin('SUPER_ADMIN');

/**
 * Admin or Super Admin middleware
 */
export const requireAdminOrAbove = authorizeAdmin('SUPER_ADMIN', 'ADMIN');
