import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
    userId: string;
    email: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

/**
 * Generate access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as any);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: TokenPayload): TokenPair => {
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
        throw new Error('Invalid or expired access token');
    }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
    return jwt.decode(token);
};
