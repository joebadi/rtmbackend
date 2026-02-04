import { z } from 'zod';

/**
 * Send like validation schema
 */
export const sendLikeSchema = z.object({
    likedUserId: z.string().uuid('Invalid user ID'),
});

export type SendLikeInput = z.infer<typeof sendLikeSchema>;

/**
 * Get likes validation schema
 */
export const getLikesSchema = z.object({
    type: z.enum(['sent', 'received', 'mutual']).default('received'),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
});

export type GetLikesInput = z.infer<typeof getLikesSchema>;
