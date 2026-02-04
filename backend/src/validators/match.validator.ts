import { z } from 'zod';

/**
 * Create/Update match preferences validation schema
 */
export const matchPreferencesSchema = z.object({
    // Age preferences
    ageMin: z.number().min(18, 'Minimum age must be at least 18').max(100),
    ageMax: z.number().min(18).max(100, 'Maximum age cannot exceed 100'),
    ageIsDealBreaker: z.boolean().default(false),

    // Relationship status
    relationshipStatus: z.array(z.string()).default([]),
    relationshipIsDealBreaker: z.boolean().default(false),

    // Location preferences
    locationCountry: z.string().optional(),
    locationStates: z.array(z.string()).default([]),
    locationTribes: z.array(z.string()).default([]),
    locationIsDealBreaker: z.boolean().default(false),

    // Religion
    religion: z.array(z.string()).default([]),
    religionIsDealBreaker: z.boolean().default(false),

    // Zodiac
    zodiac: z.array(z.string()).default([]),
    zodiacIsDealBreaker: z.boolean().default(false),

    // Genotype
    genotype: z.array(z.string()).default([]),
    genotypeIsDealBreaker: z.boolean().default(false),

    // Blood group
    bloodGroup: z.array(z.string()).default([]),
    bloodGroupIsDealBreaker: z.boolean().default(false),

    // Height
    heightMin: z.number().optional(),
    heightMax: z.number().optional(),
    heightIsDealBreaker: z.boolean().default(false),

    // Body type
    bodyType: z.array(z.string()).default([]),
    bodyTypeIsDealBreaker: z.boolean().default(false),

    // Tattoos
    tattoosAcceptable: z.boolean().optional(),
    tattoosIsDealBreaker: z.boolean().default(false),

    // Piercings
    piercingsAcceptable: z.boolean().optional(),
    piercingsIsDealBreaker: z.boolean().default(false),
}).refine((data) => data.ageMin <= data.ageMax, {
    message: 'Minimum age must be less than or equal to maximum age',
    path: ['ageMin'],
});

export type MatchPreferencesInput = z.infer<typeof matchPreferencesSchema>;

/**
 * Filter matches validation schema
 */
export const filterMatchesSchema = z.object({
    ageMin: z.number().min(18).max(100).optional(),
    ageMax: z.number().min(18).max(100).optional(),
    gender: z.enum(['MALE', 'FEMALE']).optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    maxDistance: z.number().min(1).max(500).optional(), // km
    religion: z.array(z.string()).optional(),
    education: z.array(z.string()).optional(),
    hasPhotos: z.boolean().optional(),
    isOnline: z.boolean().optional(),
    isPremium: z.boolean().optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
});

export type FilterMatchesInput = z.infer<typeof filterMatchesSchema>;

/**
 * Nearby users validation schema
 */
export const nearbyUsersSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius: z.number().min(1).max(500).default(50), // km
    limit: z.number().min(1).max(100).default(20),
});

export type NearbyUsersInput = z.infer<typeof nearbyUsersSchema>;
