import { prisma } from '../server';

export interface MatchPreferencesInput {
    ageMin: number;
    ageMax: number;
    ageIsDealBreaker?: boolean;
    relationshipStatus?: string[];
    relationshipIsDealBreaker?: boolean;
    locationCountry?: string;
    locationStates?: string[];
    locationTribes?: string[];
    locationIsDealBreaker?: boolean;
    religion?: string[];
    religionIsDealBreaker?: boolean;
    zodiac?: string[];
    zodiacIsDealBreaker?: boolean;
    genotype?: string[];
    genotypeIsDealBreaker?: boolean;
    bloodGroup?: string[];
    bloodGroupIsDealBreaker?: boolean;
    heightMin?: number;
    heightMax?: number;
    heightIsDealBreaker?: boolean;
    bodyType?: string[];
    bodyTypeIsDealBreaker?: boolean;
    tattoosAcceptable?: boolean;
    tattoosIsDealBreaker?: boolean;
    piercingsAcceptable?: boolean;
    piercingsIsDealBreaker?: boolean;
}

/**
 * Save or update match preferences
 */
export const saveMatchPreferences = async (userId: string, data: MatchPreferencesInput) => {
    // Check if preferences already exist
    const existing = await prisma.matchPreferences.findUnique({
        where: { userId },
    });

    if (existing) {
        // Update existing preferences
        return await prisma.matchPreferences.update({
            where: { userId },
            data,
        });
    } else {
        // Create new preferences
        return await prisma.matchPreferences.create({
            data: {
                userId,
                ...data,
            },
        });
    }
};

/**
 * Get match preferences for a user
 */
export const getMatchPreferences = async (userId: string) => {
    const preferences = await prisma.matchPreferences.findUnique({
        where: { userId },
    });

    if (!preferences) {
        throw new Error('Match preferences not found');
    }

    return preferences;
};

/**
 * Delete match preferences
 */
export const deleteMatchPreferences = async (userId: string) => {
    await prisma.matchPreferences.delete({
        where: { userId },
    });

    return { message: 'Match preferences deleted successfully' };
};
