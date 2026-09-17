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

/** Match legacy flat tribe/origin values case-insensitively. Older preference
 * records stored both tribe names and state-of-origin names in locationTribes. */
const flatTribeMatches = (
    wanted: string[],
    stateOfOrigin?: string | null,
    tribe?: string | null
): boolean => {
    const normalized = new Set(wanted.map((value) => value.trim().toLowerCase()));
    if (normalized.has('all')) return true;
    return [stateOfOrigin, tribe].some(
        (value) => !!value && normalized.has(value.trim().toLowerCase())
    );
};

/** Convert profile height strings such as 5'7", 5'7" (170 cm), or 170 cm. */
const parseHeightCm = (height?: string | null): number | null => {
    if (!height) return null;

    const cmMatch = height.match(/(\d+(?:\.\d+)?)\s*cm/i);
    if (cmMatch) return Math.round(Number(cmMatch[1]));

    const imperialMatch = height.match(/(\d+)\s*['′]\s*(\d+)?/);
    if (imperialMatch) {
        const feet = Number(imperialMatch[1]);
        const inches = Number(imperialMatch[2] || 0);
        return Math.round((feet * 12 + inches) * 2.54);
    }

    const numeric = Number(height.trim());
    return Number.isFinite(numeric) && numeric >= 100 && numeric <= 250
        ? Math.round(numeric)
        : null;
};

/**
 * Coupled location/origin preference blocks.
 *
 *   block = residence country + (optional) residence states + (optional) origins
 *   origin = nationality country + (optional, Nigeria-only) state-of-origin -> tribes
 *
 * Blocks are OR'd; within a block residence AND origin are required; within a block's
 * origins it's OR across nationalities. A profile satisfies "location" if it falls into
 * ANY block. Used in place of the legacy locationStates + tribePreferences scoring when
 * present.
 */
interface OriginRule {
    country: string;
    stateTribes: Record<string, string[]>;
}
interface LocationBlock {
    residenceCountry: string;
    residenceStates: string[];
    origins: OriginRule[];
}
type ProfileLocation = {
    country: string | null;
    state: string | null;
    ethnicityCountry: string | null;
    stateOfOrigin: string | null;
    tribe: string | null;
};

const parseLocationPreferences = (raw: unknown): LocationBlock[] => {
    if (!Array.isArray(raw)) return [];
    const blocks: LocationBlock[] = [];
    for (const b of raw) {
        if (!b || typeof b !== 'object') continue;
        const rec = b as Record<string, unknown>;
        const residenceCountry =
            typeof rec.residenceCountry === 'string' ? rec.residenceCountry : '';
        if (!residenceCountry) continue;
        const residenceStates = Array.isArray(rec.residenceStates)
            ? rec.residenceStates.filter((s): s is string => typeof s === 'string')
            : [];
        const origins: OriginRule[] = [];
        if (Array.isArray(rec.origins)) {
            for (const o of rec.origins) {
                if (!o || typeof o !== 'object') continue;
                const orec = o as Record<string, unknown>;
                const country = typeof orec.country === 'string' ? orec.country : '';
                if (!country) continue;
                origins.push({
                    country,
                    stateTribes: parseTribePreferences(orec.stateTribes),
                });
            }
        }
        blocks.push({ residenceCountry, residenceStates, origins });
    }
    return blocks;
};

const originMatches = (origin: OriginRule, profile: ProfileLocation): boolean => {
    if (!profile.ethnicityCountry || profile.ethnicityCountry !== origin.country) {
        return false;
    }
    if (Object.keys(origin.stateTribes).length === 0) return true;
    return tribeMatches(origin.stateTribes, profile.stateOfOrigin, profile.tribe);
};

const blockMatches = (block: LocationBlock, profile: ProfileLocation): boolean => {
    if (!profile.country || profile.country !== block.residenceCountry) return false;
    if (
        block.residenceStates.length > 0 &&
        (!profile.state || !block.residenceStates.includes(profile.state))
    ) {
        return false;
    }
    if (block.origins.length > 0 && !block.origins.some((o) => originMatches(o, profile))) {
        return false;
    }
    return true;
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

    // Relationship status.
    if (userPrefs.relationshipStatus.length > 0) {
        evaluate(
            'relationshipStatus',
            10,
            !!targetProfile.relationshipStatus &&
                userPrefs.relationshipStatus.includes(targetProfile.relationshipStatus),
            userPrefs.relationshipIsDealBreaker
        );
    }

    // Location + origin. Prefer the coupled-block model when present; otherwise fall
    // back to the legacy residence-states + tribePreferences scoring.
    const locationBlocks = parseLocationPreferences(userPrefs.locationPreferences);
    if (locationBlocks.length > 0) {
        // One combined criterion (residence AND origin) worth the legacy location+tribe weight.
        evaluate(
            'location',
            20,
            locationBlocks.some((b) => blockMatches(b, targetProfile)),
            userPrefs.locationIsDealBreaker
        );
    } else {
        // Legacy: preferred residence country/state.
        if (userPrefs.locationCountry || userPrefs.locationStates.length > 0) {
            evaluate(
                'location',
                10,
                (!userPrefs.locationCountry || targetProfile.country === userPrefs.locationCountry) &&
                    (userPrefs.locationStates.length === 0 ||
                        (!!targetProfile.state &&
                            userPrefs.locationStates.includes(targetProfile.state))),
                userPrefs.locationIsDealBreaker
            );
        }

        // Legacy: preferred state-of-origin -> tribes.
        const tribePrefs = parseTribePreferences(userPrefs.tribePreferences);
        if (Object.keys(tribePrefs).length > 0) {
            evaluate(
                'tribe',
                10,
                tribeMatches(tribePrefs, targetProfile.stateOfOrigin, targetProfile.tribe),
                // Tribe rides on the location deal-breaker toggle for now.
                userPrefs.locationIsDealBreaker
            );
        } else if (userPrefs.locationTribes.length > 0) {
            evaluate(
                'tribe',
                10,
                flatTribeMatches(
                    userPrefs.locationTribes,
                    targetProfile.stateOfOrigin,
                    targetProfile.tribe
                ),
                userPrefs.locationIsDealBreaker
            );
        }
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

    // Height. Profiles store a display string while preferences store cm.
    if (userPrefs.heightMin != null || userPrefs.heightMax != null) {
        const targetHeightCm = parseHeightCm(targetProfile.height);
        evaluate(
            'height',
            10,
            targetHeightCm != null &&
                (userPrefs.heightMin == null || targetHeightCm >= userPrefs.heightMin) &&
                (userPrefs.heightMax == null || targetHeightCm <= userPrefs.heightMax),
            userPrefs.heightIsDealBreaker
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
        // Only hard-narrow by residence state under the legacy model. With coupled
        // location blocks the residence pool spans countries/"anywhere" rules, so we
        // leave location to compatibility scoring to avoid emptying the feed.
        if (
            parseLocationPreferences(userPrefs.locationPreferences).length === 0 &&
            userPrefs.locationStates.length > 0
        ) {
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

const distanceInKm = (
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number
) => {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(latitudeB - latitudeA);
    const longitudeDelta = radians(longitudeB - longitudeA);
    const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(radians(latitudeA)) *
            Math.cos(radians(latitudeB)) *
            Math.sin(longitudeDelta / 2) ** 2;
    const a = Math.min(1, Math.max(0, haversine));
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Get nearby users with entitlement-aware distance enforcement.
 * Free users are capped at 50 km. Premium users may search within 500 km and
 * can opt into travel mode by supplying a different search centre.
 */
export const getNearbyUsers = async (userId: string, params: NearbyUsersInput) => {
    console.log(`Debug: getNearbyUsers called for ${userId}`);
    const userProfile = await prisma.profile.findUnique({
        where: { userId },
        include: {
            user: { select: { isPremium: true } },
        },
    });

    if (!userProfile) {
        console.log('Debug: Profile not found');
        throw new Error('Profile not found');
    }

    if (!userProfile.user.isPremium && params.useCustomLocation) {
        const error: any = new Error('Travel mode requires a premium subscription');
        error.status = 403;
        throw error;
    }

    const maximumRadius = userProfile.user.isPremium ? 500 : 50;
    const effectiveRadius = Math.min(Math.max(params.radius, 1), maximumRadius);
    const centerLatitude = params.latitude;
    const centerLongitude = params.longitude;
    const latitudeDelta = effectiveRadius / 110.574;
    const longitudeScale = Math.max(
        Math.abs(Math.cos((centerLatitude * Math.PI) / 180)),
        0.01
    );
    const longitudeDelta = effectiveRadius / (111.32 * longitudeScale);
    console.log(`Debug: User gender: ${userProfile.gender}`);

    const targetGender = userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE';
    const excluded = await getExcludedUserIds(userId);

    const whereClause: Prisma.ProfileWhereInput = {
        userId: { not: userId, notIn: excluded },
        gender: targetGender as 'MALE' | 'FEMALE', // Re-enabled for proper matching
        isActive: true,
        isBanned: false,
        AND: [
            {
                OR: [
                    // Demo profiles intentionally remain visible for product demos.
                    { user: { isTest: true } },
                    {
                        latitude: {
                            not: null,
                            gte: Math.max(-90, centerLatitude - latitudeDelta),
                            lte: Math.min(90, centerLatitude + latitudeDelta),
                        },
                        longitude: {
                            not: null,
                            gte: Math.max(-180, centerLongitude - longitudeDelta),
                            lte: Math.min(180, centerLongitude + longitudeDelta),
                        },
                    },
                ],
            },
        ],
    };
    console.log('Debug: Query where clause:', JSON.stringify(whereClause));

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
                    isTest: true,
                    matchPreferences: true,
                },
            },
        },
    });

    console.log(`Debug: Found ${profiles.length} profiles`);
    if (profiles.length > 0) {
        console.log('Debug: First profile photos:', profiles[0].photos);
        console.log('Debug: First profile user:', profiles[0].user);
    }

    const profilesWithDistance = profiles
        .map((profile) => {
            const hasCoordinates =
                profile.latitude !== null && profile.longitude !== null;
            const distance = hasCoordinates
                ? distanceInKm(
                      centerLatitude,
                      centerLongitude,
                      profile.latitude as number,
                      profile.longitude as number
                  )
                : profile.user.isTest
                  ? 0
                  : Number.POSITIVE_INFINITY;
            return {
                ...profile,
                distance,
                photos: profile.photos || [],
                user: profile.user,
            };
        })
        .filter(
            (profile) =>
                profile.user.isTest || profile.distance <= effectiveRadius
        )
        .sort((left, right) => left.distance - right.distance)
        .slice(0, params.limit)
        .map((profile) => ({
            ...profile,
            distance: Math.round(profile.distance),
        }));

    return {
        users: profilesWithDistance,
        radius: effectiveRadius,
        center: {
            latitude: centerLatitude,
            longitude: centerLongitude,
        },
    };
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
        // Only hard-narrow by residence state under the legacy model. With coupled
        // location blocks the residence pool spans countries/"anywhere" rules, so we
        // leave location to compatibility scoring to avoid emptying the feed.
        if (
            parseLocationPreferences(userPrefs.locationPreferences).length === 0 &&
            userPrefs.locationStates.length > 0
        ) {
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

/**
 * Users whose OWN partner preferences my profile satisfies — i.e. "people
 * looking for me". For each opposite-gender candidate who has set preferences,
 * we score THEIR preferences against MY profile (calculateCompatibility(themId,
 * myId)), drop anyone whose deal-breakers I fail, and sort by how strongly they
 * match me. The shape mirrors getMatchSuggestions: `{ profile, compatibility }`.
 */
export const getUsersInterestedInMe = async (userId: string, limit: number = 50) => {
    const userProfile = await prisma.profile.findUnique({ where: { userId } });
    if (!userProfile) {
        throw new Error('Profile not found');
    }

    const targetGender = userProfile.gender === 'MALE' ? 'FEMALE' : 'MALE';
    const excluded = await getExcludedUserIds(userId);

    const profiles = await prisma.profile.findMany({
        where: {
            userId: { not: userId, notIn: excluded },
            gender: targetGender as 'MALE' | 'FEMALE',
            isActive: true,
            isBanned: false,
            // They must have preferences for their side to match my profile.
            user: { isEmailVerified: true, matchPreferences: { isNot: null } },
        },
        include: {
            photos: { orderBy: { isPrimary: 'desc' }, take: 3 },
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
        take: limit * 4, // scored + filtered below
    });

    const scored = await Promise.all(
        profiles.map(async (profile) => {
            // THEIR preferences vs MY profile.
            const compatibility = await calculateCompatibility(profile.userId, userId);
            return { profile, compatibility };
        })
    );

    return scored
        .filter((m) => m.compatibility.dealBreakers.length === 0)
        .sort((a, b) => {
            if (a.profile.user.isOnline && !b.profile.user.isOnline) return -1;
            if (!a.profile.user.isOnline && b.profile.user.isOnline) return 1;
            return b.compatibility.score - a.compatibility.score;
        })
        .slice(0, limit);
};
