import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-change-in-production';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '8h';

export interface AdminTokenPayload {
    adminId: string;
    email: string;
    role: string;
}

/**
 * Generate admin access token
 */
export const generateAdminToken = (payload: AdminTokenPayload): string => {
    return jwt.sign(payload, ADMIN_JWT_SECRET, {
        expiresIn: ADMIN_JWT_EXPIRES_IN
    } as any);
};

/**
 * Verify admin token
 */
export const verifyAdminToken = (token: string): AdminTokenPayload => {
    try {
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired admin token');
    }
};
