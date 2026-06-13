import { z } from 'zod';

/**
 * Create / update a Live Dates event (admin).
 */
export const createEventSchema = z.object({
    title: z.string().min(2).max(120),
    description: z.string().max(2000).optional(),
    type: z.enum(['SPEED_DATING', 'BLIND_DATE']),
    startsAt: z.coerce.date(),
    bookingOpensAt: z.coerce.date(),
    recurrence: z.string().max(120).optional().nullable(),
    capacity: z.number().int().min(2).max(1000),
    diamondCost: z.number().int().min(0).default(0),
    roundSeconds: z.number().int().min(30).max(1800).default(180),
    maxRounds: z.number().int().min(1).max(50).default(8),
    minProfileCompleteness: z.number().int().min(0).max(100).default(0),
    requireVerified: z.boolean().default(false),
    genderBalanced: z.boolean().default(true),
    freeUnveils: z.number().int().min(0).max(20).default(3),
    unveilCost: z.number().int().min(0).default(20),
    coverImageUrl: z.string().url().optional().nullable(),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
