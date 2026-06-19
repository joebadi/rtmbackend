import { prisma } from '../server';
import { Prisma } from '@prisma/client';
import { getExcludedUserIds } from './relationship.service';
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
 * Parse the tribePreferences JSON ({ "Edo": ["Esan"], "Delta": ["All"] }) defensively.
 */
const parseTribePreferences = (raw: unknown): Record<string, string[]> => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, string[]> = {};
    for (const [state, tribes] of Object.entries(raw as Record<string, unknown>)) {
        if (Array.isArray(tribes)) {
            out[state] = tribes.filter((t): t is string => typeof t === 'string');
        }
    }
    return out;
};

/**
 * Does a candidate's state-of-origin / tribe satisfy a state->tribes preference map?
 * Matches when the candidate's stateOfOrigin is a preferred key AND that state's list
 * either contains "All" or contains the candidate's tribe.
 */
const tribeMatches = (
    prefs: Record<string, string[]>,
    stateOfOrigin?: string | null,
    tribe?: string | null
): boolean => {
    if (!stateOfOrigin) return false;
    const wanted = prefs[stateOfOrigin];
    if (!wanted || wanted.length === 0) return false;
    if (wanted.includes('All')) return true;
    return tribe != null && wanted.includes(tribe);
};

/**
 * Calculate how well `targetUserId`'s profile satisfies `userId`'s stated preferences.
 * Returns a normalized 0-100 percentage over only the criteria the preference-owner
 * actually set, the list of matched field keys, and any unmet deal-breakers.
 */
export const calculateCompatibility = async (
    userId: string,
    targetUserId: string
): Promise<{ score: number; matches: string[]; dealBreakers: string[] }> => {
    // We score userId's preferences against targetUserId's profile.
    const [targetProfile, userPrefs] = await Promise.all([
        prisma.profile.findUnique({ where: { userId: targetUserId } }),
        prisma.matchPreferences.findUnique({ where: { userId } }),
    ]);

    if (!targetProfile) {
        throw new Error('Profile not found');
    }

    const matches: string[] = [];
    const dealBreakers: string[] = [];

    // No preferences set -> neutral baseline.
    if (!userPrefs) {
        return { score: 50, matches: [], dealBreakers: [] };
    }

    let earned = 0;
    let maxPossible = 0;

    // Helper: register one criterion that the user actually expressed a preference on.
    const evaluate = (
        key: string,
        weight: number,
        satisfied: boolean,
        isDealBreaker: boolean
    ): boolean => {
        maxPossible += weight;
        if (satisfied) {
            earned += weight;
            matches.push(key);
            return true;
        }
        if (isDealBreaker) dealBreakers.push(key);
        return false;
    };

    // Age (always an active criterion).
    evaluate(
        'age',
        15,
        targetProfile.age >= userPrefs.ageMin && targetProfile.age <= userPrefs.ageMax,
        userPrefs.ageIsDealBreaker
    );

    // Location (preferred residence state).
    if (userPrefs.locationStates.length > 0) {
        evaluate(
            'location',
            10,
            !!targetProfile.state && userPrefs.locationStates.includes(targetProfile.state),
            userPrefs.locationIsDealBreaker
        );
    }

    // Tribe (preferred state-of-origin -> tribes).
    const tribePrefs = parseTribePreferences(userPrefs.tribePreferences);
    if (Object.keys(tribePrefs).length > 0) {
        evaluate(
            'tribe',
            10,
            tribeMatches(tribePrefs, targetProfile.stateOfOrigin, targetProfile.tribe),
            // Tribe rides on the location deal-breaker toggle for now.
            userPrefs.locationIsDealBreaker
        );
    }

    // Religion.
    if (userPrefs.religion.length > 0) {
        evaluate(
            'religion',
            15,
            !!targetProfile.religion && userPrefs.religion.includes(targetProfile.religion),
            userPrefs.religionIsDealBreaker
        );
    }

    // Zodiac.
    if (userPrefs.zodiac.length > 0) {
        evaluate(
            'zodiac',
            10,
            userPrefs.zodiac.includes(targetProfile.zodiacSign),
            userPrefs.zodiacIsDealBreaker
        );
    }

    // Genotype.
    if (userPrefs.genotype.length > 0) {
        evaluate(
            'genotype',
            10,
            !!targetProfile.genotype && userPrefs.genotype.includes(targetProfile.genotype),
            userPrefs.genotypeIsDealBreaker
        );
    }

    // Blood group.
    if (userPrefs.bloodGroup.length > 0) {
        evaluate(
            'bloodGroup',
            5,
            !!targetProfile.bloodGroup && userPrefs.bloodGroup.includes(targetProfile.bloodGroup),
            userPrefs.bloodGroupIsDealBreaker
        );
    }

    // Body type.
    if (userPrefs.bodyType.length > 0) {
        evaluate(
            'bodyType',
            10,
            !!targetProfile.bodyType && userPrefs.bodyType.includes(targetProfile.bodyType),
            userPrefs.bodyTypeIsDealBreaker
        );
    }

    // Tattoos.
    if (userPrefs.tattoosAcceptable !== null && userPrefs.tattoosAcceptable !== undefined) {
        evaluate(
            'tattoos',
            5,
            userPrefs.tattoosAcceptable === targetProfile.hasTattoos,
            userPrefs.tattoosIsDealBreaker
        );
    }

    // Piercings.
    if (userPrefs.piercingsAcceptable !== null && userPrefs.piercingsAcceptable !== undefined) {
        evaluate(
            'piercings',
            5,
            userPrefs.piercingsAcceptable === targetProfile.hasPiercings,
            userPrefs.piercingsIsDealBreaker
        );
    }

    // An unmet deal-breaker zeroes the score outright.
    if (dealBreakers.length > 0) {
        return { score: 0, matches, dealBreakers };
    }

    // Normalize to a true percentage over the criteria actually expressed.
    const score = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : 50;

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
    const excluded = await getExcludedUserIds(userId);

    // Build where clause based on preferences
    const where: Prisma.ProfileWhereInput = {
        userId: { not: userId, notIn: excluded },
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
    const excluded = await getExcludedUserIds(userId);

    const whereClause = {
        userId: { not: userId, notIn: excluded },
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
                    matchPreferences: true,
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
    const excluded = await getExcludedUserIds(userId);

    const where: Prisma.ProfileWhereInput = {
        userId: { not: userId, notIn: excluded },
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
                    matchPreferences: true,
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
};
