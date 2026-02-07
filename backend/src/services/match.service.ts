import { prisma } from '../server';
import { Prisma } from '@prisma/client';
import {
    MatchPreferencesInput,
    FilterMatchesInput,
    NearbyUsersInput,
} from '../validators/match.validator';

/**
 * Create or update match preferences
 */
export const setMatchPreferences = async (
    userId: string,
    data: MatchPreferencesInput
) => {
    // Check if preferences already exist
    const existing = await prisma.matchPreferences.findUnique({
        where: { userId },
    });

    if (existing) {
        // Update existing preferences
        return prisma.matchPreferences.update({
            where: { userId },
            data,
        });
    } else {
        // Create new preferences
        return prisma.matchPreferences.create({
            data: {
                userId,
                ...data,
            },
        });
    }
};

/**
 * Get user's match preferences
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
 * Calculate compatibility score between two users
 */
export const calculateCompatibility = async (
    userId: string,
    targetUserId: string
): Promise<{ score: number; matches: string[]; dealBreakers: string[] }> => {
    // Get both users' profiles and preferences
    const [userProfile, targetProfile, userPrefs] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.profile.findUnique({ where: { userId: targetUserId } }),
        prisma.matchPreferences.findUnique({ where: { userId } }),
    ]);

    if (!userProfile || !targetProfile) {
        throw new Error('Profile not found');
    }

    let score = 0;
    const matches: string[] = [];
    const dealBreakers: string[] = [];

    if (!userPrefs) {
        return { score: 50, matches: [], dealBreakers: [] }; // Default score if no preferences
    }

    // Age compatibility
    if (targetProfile.age >= userPrefs.ageMin && targetProfile.age <= userPrefs.ageMax) {
        score += 15;
        matches.push('age');
    } else if (userPrefs.ageIsDealBreaker) {
        dealBreakers.push('age');
        return { score: 0, matches, dealBreakers };
    }

    // Location compatibility
    if (userPrefs.locationStates.length > 0) {
        if (targetProfile.state && userPrefs.locationStates.includes(targetProfile.state)) {
            score += 10;
            matches.push('location');
        } else if (userPrefs.locationIsDealBreaker) {
            dealBreakers.push('location');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Religion compatibility
    if (userPrefs.religion.length > 0) {
        if (targetProfile.religion && userPrefs.religion.includes(targetProfile.religion)) {
            score += 15;
            matches.push('religion');
        } else if (userPrefs.religionIsDealBreaker) {
            dealBreakers.push('religion');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Zodiac compatibility
    if (userPrefs.zodiac.length > 0) {
        if (userPrefs.zodiac.includes(targetProfile.zodiacSign)) {
            score += 10;
            matches.push('zodiac');
        } else if (userPrefs.zodiacIsDealBreaker) {
            dealBreakers.push('zodiac');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Genotype compatibility
    if (userPrefs.genotype.length > 0) {
        if (targetProfile.genotype && userPrefs.genotype.includes(targetProfile.genotype)) {
            score += 10;
            matches.push('genotype');
        } else if (userPrefs.genotypeIsDealBreaker) {
            dealBreakers.push('genotype');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Blood group compatibility
    if (userPrefs.bloodGroup.length > 0) {
        if (targetProfile.bloodGroup && userPrefs.bloodGroup.includes(targetProfile.bloodGroup)) {
            score += 5;
            matches.push('bloodGroup');
        } else if (userPrefs.bloodGroupIsDealBreaker) {
            dealBreakers.push('bloodGroup');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Body type compatibility
    if (userPrefs.bodyType.length > 0) {
        if (targetProfile.bodyType && userPrefs.bodyType.includes(targetProfile.bodyType)) {
            score += 10;
            matches.push('bodyType');
        } else if (userPrefs.bodyTypeIsDealBreaker) {
            dealBreakers.push('bodyType');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Tattoos compatibility
    if (userPrefs.tattoosAcceptable !== null && userPrefs.tattoosAcceptable !== undefined) {
        if (userPrefs.tattoosAcceptable === targetProfile.hasTattoos) {
            score += 5;
            matches.push('tattoos');
        } else if (userPrefs.tattoosIsDealBreaker) {
            dealBreakers.push('tattoos');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Piercings compatibility
    if (userPrefs.piercingsAcceptable !== null && userPrefs.piercingsAcceptable !== undefined) {
        if (userPrefs.piercingsAcceptable === targetProfile.hasPiercings) {
            score += 5;
            matches.push('piercings');
        } else if (userPrefs.piercingsIsDealBreaker) {
            dealBreakers.push('piercings');
            return { score: 0, matches, dealBreakers };
        }
    }

    // Education level match (bonus points)
    if (userProfile.education && targetProfile.education) {
        if (userProfile.education === targetProfile.education) {
            score += 10;
            matches.push('education');
        }
    }

    // Lifestyle compatibility (bonus points)
    if (userProfile.drinkingStatus && targetProfile.drinkingStatus) {
        if (userProfile.drinkingStatus === targetProfile.drinkingStatus) {
            score += 5;
            matches.push('lifestyle');
        }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return { score, matches, dealBreakers };
};

/**
 * Get potential matches based on user preferences
 */
export const getMatches = async (userId: string, limit: number = 20, offset: number = 0) => {
    // Get user's profile and preferences
    const [userProfile, userPrefs] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.matchPreferences.findUnique({ where: { userId } }),
    ]);

    if (!userProfile) {
        throw new Error('Profile not found');
    }

    // Get opposite gender
    const targetGender = userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE';

    // Build where clause based on preferences
    const where: Prisma.ProfileWhereInput = {
        userId: { not: userId },
        gender: targetGender,
        isActive: true,
        isBanned: false,
        user: {
            isEmailVerified: true,
        },
    };

    // Apply age filter if preferences exist
    if (userPrefs) {
        where.age = {
            gte: userPrefs.ageMin,
            lte: userPrefs.ageMax,
        };

        // Apply location filter
        if (userPrefs.locationStates.length > 0) {
            where.state = { in: userPrefs.locationStates };
        }

        // Apply religion filter
        if (userPrefs.religion.length > 0) {
            where.religion = { in: userPrefs.religion };
        }
    }

    // Get matches
    const profiles = await prisma.profile.findMany({
        where,
        include: {
            photos: {
                where: { isVerified: true },
                orderBy: { isPrimary: 'desc' },
                take: 1,
            },
            user: {
                select: {
                    id: true,
                    isPremium: true,
                    isOnline: true,
                    lastActive: true,
                },
            },
        },
        orderBy: [
            { user: { isPremium: 'desc' } }, // Premium users first
            { user: { isOnline: 'desc' } },  // Online users next
            { updatedAt: 'desc' },            // Recently updated profiles
        ],
        take: limit,
        skip: offset,
    });

    // Calculate compatibility scores
    const matchesWithScores = await Promise.all(
        profiles.map(async (profile) => {
            const compatibility = await calculateCompatibility(userId, profile.userId);
            return {
                profile,
                compatibility,
            };
        })
    );

    // Filter out deal breakers and sort by score
    const validMatches = matchesWithScores
        .filter((m) => m.compatibility.dealBreakers.length === 0)
        .sort((a, b) => b.compatibility.score - a.compatibility.score);

    return validMatches;
};

/**
 * Filter matches with custom criteria
 */
export const filterMatches = async (userId: string, filters: FilterMatchesInput) => {
    const userProfile = await prisma.profile.findUnique({ where: { userId } });

    if (!userProfile) {
        throw new Error('Profile not found');
    }

    const targetGender = filters.gender || (userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE');

    const where: Prisma.ProfileWhereInput = {
        userId: { not: userId },
        gender: targetGender,
        isActive: true,
        isBanned: false,
    };

    // Age filter
    if (filters.ageMin || filters.ageMax) {
        where.age = {};
        if (filters.ageMin) where.age.gte = filters.ageMin;
        if (filters.ageMax) where.age.lte = filters.ageMax;
    }

    // Location filters
    if (filters.country) where.country = filters.country;
    if (filters.state) where.state = filters.state;
    if (filters.city) where.city = filters.city;

    // Religion filter
    if (filters.religion && filters.religion.length > 0) {
        where.religion = { in: filters.religion };
    }

    // Education filter
    if (filters.education && filters.education.length > 0) {
        where.education = { in: filters.education };
    }

    // Has photos filter
    if (filters.hasPhotos) {
        where.photos = { some: {} };
    }

    // Online status filter
    if (filters.isOnline) {
        if (!where.user) where.user = {};
        (where.user as any).isOnline = true;
    }

    // Premium filter
    if (filters.isPremium) {
        if (!where.user) where.user = {};
        (where.user as any).isPremium = true;
    }

    const profiles = await prisma.profile.findMany({
        where,
        include: {
            photos: {
                where: { isVerified: true },
                orderBy: { isPrimary: 'desc' },
                take: 1,
            },
            user: {
                select: {
                    id: true,
                    isPremium: true,
                    isOnline: true,
                    lastActive: true,
                },
            },
        },
        orderBy: [
            { user: { isPremium: 'desc' } },
            { user: { isOnline: 'desc' } },
            { updatedAt: 'desc' },
        ],
        take: filters.limit,
        skip: filters.offset,
    });

    return profiles;
};

/**
 * Get nearby users (simplified - will use PostGIS later)
 */
export const getNearbyUsers = async (userId: string, params: NearbyUsersInput) => {
    console.log(`Debug: getNearbyUsers called for ${userId}`);
    const userProfile = await prisma.profile.findUnique({ where: { userId } });

    if (!userProfile) {
        console.log('Debug: Profile not found');
        throw new Error('Profile not found');
    }
    console.log(`Debug: User gender: ${userProfile.gender}`);

    const targetGender = userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE';

    const whereClause = {
        userId: { not: userId },
        gender: targetGender as 'MALE' | 'FEMALE', // Re-enabled for proper matching
        isActive: true,
        isBanned: false,
        // Removed showOnMap requirement - new users don't have this set
    };
    console.log('Debug: Query where clause:', JSON.stringify(whereClause));

    // For now, return users from same country/state
    // TODO: Implement PostGIS distance calculation
    const profiles = await prisma.profile.findMany({
        where: whereClause,
        include: {
            photos: {
                // Removed isVerified filter - show all photos for better UX
                orderBy: { isPrimary: 'desc' },
                take: 3, // Increased to show more photos
            },
            user: {
                select: {
                    id: true,
                    email: true, // For debugging
                    isPremium: true,
                    isOnline: true,
                    lastActive: true,
                },
            },
        },
        take: params.limit,
    });

    console.log(`Debug: Found ${profiles.length} profiles`);
    if (profiles.length > 0) {
        console.log('Debug: First profile photos:', profiles[0].photos);
        console.log('Debug: First profile user:', profiles[0].user);
    }

    // Return profiles with distance - preserve nested structure for photos and user
    const profilesWithDistance = profiles.map((profile) => ({
        ...profile,
        distance: 0, // Placeholder
        // Ensure photos and user are preserved
        photos: profile.photos || [],
        user: profile.user,
    }));

    return profilesWithDistance;
};

/**
 * Get match suggestions (smart algorithm)
 */
export const getMatchSuggestions = async (userId: string, limit: number = 10) => {
    const userProfile = await prisma.profile.findUnique({ where: { userId } });

    if (!userProfile) {
        throw new Error('Profile not found');
    }

    // Try to get preferences, but don't fail if they don't exist
    const userPrefs = await prisma.matchPreferences.findUnique({ where: { userId } });

    const targetGender = userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE';

    const where: Prisma.ProfileWhereInput = {
        userId: { not: userId },
        gender: targetGender as 'MALE' | 'FEMALE',
        isActive: true,
        isBanned: false,
        user: {
            isEmailVerified: true,
        },
    };

    // Apply preferences if they exist
    if (userPrefs) {
        where.age = {
            gte: userPrefs.ageMin,
            lte: userPrefs.ageMax,
        };

        // Apply location filter if specified
        if (userPrefs.locationStates.length > 0) {
            where.state = { in: userPrefs.locationStates };
        }

        // Apply religion filter if specified
        if (userPrefs.religion.length > 0) {
            where.religion = { in: userPrefs.religion };
        }
    }

    const profiles = await prisma.profile.findMany({
        where,
        include: {
            photos: {
                // Removed isVerified filter - show all photos for better UX
                orderBy: { isPrimary: 'desc' },
                take: 3, // Increased to show more photos
            },
            user: {
                select: {
                    id: true,
                    isPremium: true,
                    isOnline: true,
                    lastActive: true,
                },
            },
        },
        orderBy: [
            { user: { isPremium: 'desc' } }, // Premium users first
            { user: { isOnline: 'desc' } },  // Online users next
            { updatedAt: 'desc' },            // Recently updated profiles
        ],
        take: limit * 2, // Get more to filter
    });

    // Calculate compatibility if preferences exist, otherwise return basic profile
    if (userPrefs) {
        const matchesWithScores = await Promise.all(
            profiles.map(async (profile) => {
                const compatibility = await calculateCompatibility(userId, profile.userId);
                return {
                    profile,
                    compatibility,
                };
            })
        );

        // Filter out deal breakers and sort by score
        const suggestions = matchesWithScores
            .filter((m) => m.compatibility.dealBreakers.length === 0)
            .sort((a, b) => {
                // Prioritize online users
                if (a.profile.user.isOnline && !b.profile.user.isOnline) return -1;
                if (!a.profile.user.isOnline && b.profile.user.isOnline) return 1;

                // Then by compatibility score
                return b.compatibility.score - a.compatibility.score;
            })
            .slice(0, limit);

        return suggestions;
    }

    // Return profiles without compatibility scores for users without preferences
    // Preserve photos and user data
    return profiles.slice(0, limit).map(profile => ({
        ...profile,
        distance: 0,
        photos: profile.photos || [],
        user: profile.user,
        compatibility: null,
    }));
    compatibility: { score: 50, matches: [], dealBreakers: [] }
}));
};
