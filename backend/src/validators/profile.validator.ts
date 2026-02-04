import { z } from 'zod';

/**
 * Create profile validation schema
 */
export const createProfileSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    dateOfBirth: z.string().refine((date) => {
        const birthDate = new Date(date);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        return age >= 18 && age <= 100;
    }, 'You must be between 18 and 100 years old'),
    gender: z.enum(['MALE', 'FEMALE']),
    zodiacSign: z.string().optional(),
    aboutMe: z.string().max(500, 'About me must be less than 500 characters').optional(),
    hobbies: z.string().max(300, 'Hobbies must be less than 300 characters').optional(),

    // Location
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),

    // Ethnicity
    ethnicityCountry: z.string().optional(),
    stateOfOrigin: z.string().optional(),
    tribe: z.string().optional(),

    // Personal Details
    relationshipStatus: z.string().optional(),
    language: z.string().default('English'),
    workStatus: z.string().optional(),
    education: z.string().optional(),
    religion: z.string().optional(),
    personalityType: z.string().optional(),
    divorceView: z.string().optional(),

    // Physical Attributes
    height: z.string().optional(),
    bodyType: z.string().optional(),
    skinColor: z.string().optional(),
    eyeColor: z.string().optional(),
    hasTattoos: z.boolean().default(false),
    hasPiercings: z.boolean().default(false),
    isHairy: z.boolean().default(false),
    hasTribalMarks: z.boolean().default(false),
    bestFeature: z.string().optional(),

    // Medical Information
    genotype: z.string().optional(),
    bloodGroup: z.string().optional(),
    hivPartnerView: z.string().optional(),

    // Lifestyle
    drinkingStatus: z.string().optional(),
    smokingStatus: z.string().optional(),
    hasChildren: z.string().optional(),
    livingConditions: z.string().optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;

/**
 * Update profile validation schema (all fields optional)
 */
export const updateProfileSchema = createProfileSchema.partial();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Privacy settings validation schema
 */
export const privacySettingsSchema = z.object({
    showOnMap: z.boolean().optional(),
    isAnonymous: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
});

export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
