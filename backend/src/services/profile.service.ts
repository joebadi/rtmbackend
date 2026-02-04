import { prisma } from '../server';
import { uploadImage, deleteImage } from '../utils/storage.util';
import {
    geocodeAddress,
    parseLocationString,
} from '../utils/geolocation.util';
import {
    CreateProfileInput,
    UpdateProfileInput,
    PrivacySettingsInput,
} from '../validators/profile.validator';

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

/**
 * Calculate zodiac sign from date of birth
 */
const calculateZodiacSign = (dateOfBirth: Date): string => {
    const month = dateOfBirth.getMonth() + 1;
    const day = dateOfBirth.getDate();

    const zodiacSigns = [
        { sign: 'Capricorn', start: [12, 22], end: [1, 19] },
        { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
        { sign: 'Pisces', start: [2, 19], end: [3, 20] },
        { sign: 'Aries', start: [3, 21], end: [4, 19] },
        { sign: 'Taurus', start: [4, 20], end: [5, 20] },
        { sign: 'Gemini', start: [5, 21], end: [6, 20] },
        { sign: 'Cancer', start: [6, 21], end: [7, 22] },
        { sign: 'Leo', start: [7, 23], end: [8, 22] },
        { sign: 'Virgo', start: [8, 23], end: [9, 22] },
        { sign: 'Libra', start: [9, 23], end: [10, 22] },
        { sign: 'Scorpio', start: [10, 23], end: [11, 21] },
        { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
    ];

    for (const { sign, start, end } of zodiacSigns) {
        if (
            (month === start[0] && day >= start[1]) ||
            (month === end[0] && day <= end[1])
        ) {
            return sign;
        }
    }

    return 'Unknown';
};

/**
 * Calculate profile completeness percentage
 */
const calculateProfileCompleteness = (profile: any): number => {
    const fields = [
        'firstName', 'lastName', 'dateOfBirth', 'gender', 'aboutMe',
        'city', 'state', 'country', 'height', 'bodyType',
        'education', 'workStatus', 'religion',
    ];

    const filledFields = fields.filter(field => profile[field]).length;
    return Math.round((filledFields / fields.length) * 100);
};

/**
 * Create user profile
 */
export const createProfile = async (userId: string, data: CreateProfileInput) => {
    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
        where: { userId },
    });

    if (existingProfile) {
        throw new Error('Profile already exists');
    }

    // Calculate age and zodiac sign
    const dateOfBirth = new Date(data.dateOfBirth);
    const age = calculateAge(dateOfBirth);
    const zodiacSign = data.zodiacSign || calculateZodiacSign(dateOfBirth);

    // Create profile
    const profile = await prisma.profile.create({
        data: {
            userId,
            ...data,
            dateOfBirth,
            age,
            zodiacSign,
            profileCompleteness: 0, // Will be calculated after creation
        },
    });

    // Calculate and update completeness
    const completeness = calculateProfileCompleteness(profile);
    const updatedProfile = await prisma.profile.update({
        where: { id: profile.id },
        data: { profileCompleteness: completeness },
        include: {
            photos: true,
        },
    });

    return updatedProfile;
};

/**
 * Get user profile
 */
export const getProfile = async (userId: string) => {
    const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
            photos: {
                orderBy: { isPrimary: 'desc' },
            },
            user: {
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    isPremium: true,
                    diamonds: true,
                    isOnline: true,
                    lastActive: true,
                },
            },
        },
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    return profile;
};

/**
 * Get profile by ID (for viewing other users)
 */
export const getProfileById = async (profileUserId: string, viewerUserId?: string) => {
    const profile = await prisma.profile.findUnique({
        where: { userId: profileUserId },
        include: {
            photos: {
                where: { isVerified: true },
                orderBy: { isPrimary: 'desc' },
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
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    // Check if profile is active and not banned
    if (!profile.isActive || profile.isBanned) {
        throw new Error('Profile is not available');
    }

    // Track profile view if viewer is different from profile owner
    if (viewerUserId && viewerUserId !== profileUserId) {
        await prisma.profileView.create({
            data: {
                viewerId: viewerUserId,
                viewedId: profileUserId,
            },
        }).catch(() => { }); // Ignore if already viewed

        // Increment view count
        await prisma.profile.update({
            where: { id: profile.id },
            data: { viewCount: { increment: 1 } },
        });
    }

    return profile;
};

/**
 * Update profile
 */
export const updateProfile = async (userId: string, data: UpdateProfileInput) => {
    const profile = await prisma.profile.findUnique({
        where: { userId },
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    // Update age if dateOfBirth changed
    let age = profile.age;
    let zodiacSign = profile.zodiacSign;

    if (data.dateOfBirth) {
        const dateOfBirth = new Date(data.dateOfBirth);
        age = calculateAge(dateOfBirth);
        zodiacSign = data.zodiacSign || calculateZodiacSign(dateOfBirth);
    }

    // Handle location with geolocation
    let locationData: any = {};
    if (data.location) {
        try {
            // Parse location string (e.g., "Lagos, Lagos State, Nigeria")
            const parsed = parseLocationString(data.location);

            // Geocode to get coordinates
            const geocoded = await geocodeAddress(data.location);

            locationData = {
                city: geocoded.city || parsed.city,
                state: geocoded.state || parsed.state,
                country: geocoded.country || parsed.country,
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
                // Note: PostGIS location field can be populated later with a migration if needed
            };
        } catch (error) {
            console.error('Geolocation error:', error);
            // If geocoding fails, just parse the string
            const parsed = parseLocationString(data.location);
            locationData = {
                city: parsed.city,
                state: parsed.state,
                country: parsed.country,
            };
        }
    }

    // Map Flutter field names to backend field names
    const mappedData: any = { ...data };

    // ethnicityState → stateOfOrigin
    if (data.ethnicityState !== undefined) {
        mappedData.stateOfOrigin = data.ethnicityState;
        delete mappedData.ethnicityState;
    }

    // zodiac → zodiacSign
    if (data.zodiac !== undefined) {
        mappedData.zodiacSign = data.zodiac;
        delete mappedData.zodiac;
    }

    // Transform gender string to enum (Male → MALE, Female → FEMALE)
    if (data.gender) {
        mappedData.gender = data.gender.toUpperCase();
    }

    // Remove location from mapped data (we'll use locationData)
    delete mappedData.location;

    // Update profile
    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: {
            ...mappedData,
            ...locationData,
            ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth), age, zodiacSign }),
        },
        include: {
            photos: true,
        },
    });

    // Recalculate completeness
    const completeness = calculateProfileCompleteness(updatedProfile);
    const finalProfile = await prisma.profile.update({
        where: { id: updatedProfile.id },
        data: { profileCompleteness: completeness },
        include: {
            photos: true,
        },
    });

    return finalProfile;
};

/**
 * Upload profile photo
 */
export const uploadPhoto = async (
    userId: string,
    buffer: Buffer,
    filename: string,
    isPrimary: boolean = false
) => {
    const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    // Check photo limit (max 6 photos)
    if (profile.photos.length >= 6) {
        throw new Error('Maximum 6 photos allowed');
    }

    // Upload image
    const uploadResult = await uploadImage(buffer, `profiles/${userId}`, filename);

    // If this is the first photo or explicitly set as primary, make it primary
    const shouldBePrimary = isPrimary || profile.photos.length === 0;

    // If setting as primary, unset other primary photos
    if (shouldBePrimary) {
        await prisma.photo.updateMany({
            where: { profileId: profile.id, isPrimary: true },
            data: { isPrimary: false },
        });
    }

    // Create photo record
    const photo = await prisma.photo.create({
        data: {
            profileId: profile.id,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            isPrimary: shouldBePrimary,
        },
    });

    return photo;
};

/**
 * Delete photo
 */
export const deletePhoto = async (userId: string, photoId: string) => {
    const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: { profile: true },
    });

    if (!photo) {
        throw new Error('Photo not found');
    }

    if (photo.profile.userId !== userId) {
        throw new Error('Unauthorized');
    }

    // Delete from storage
    await deleteImage(photo.publicId, photo.url);

    // Delete from database
    await prisma.photo.delete({
        where: { id: photoId },
    });

    // If this was primary photo, set another photo as primary
    if (photo.isPrimary) {
        const nextPhoto = await prisma.photo.findFirst({
            where: { profileId: photo.profileId },
            orderBy: { uploadedAt: 'desc' },
        });

        if (nextPhoto) {
            await prisma.photo.update({
                where: { id: nextPhoto.id },
                data: { isPrimary: true },
            });
        }
    }

    return { message: 'Photo deleted successfully' };
};

/**
 * Set primary photo
 */
export const setPrimaryPhoto = async (userId: string, photoId: string) => {
    const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: { profile: true },
    });

    if (!photo) {
        throw new Error('Photo not found');
    }

    if (photo.profile.userId !== userId) {
        throw new Error('Unauthorized');
    }

    // Unset other primary photos
    await prisma.photo.updateMany({
        where: { profileId: photo.profileId, isPrimary: true },
        data: { isPrimary: false },
    });

    // Set this photo as primary
    const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: { isPrimary: true },
    });

    return updatedPhoto;
};

/**
 * Update privacy settings
 */
export const updatePrivacySettings = async (
    userId: string,
    data: PrivacySettingsInput
) => {
    const profile = await prisma.profile.findUnique({
        where: { userId },
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data,
    });

    return updatedProfile;
};

/**
 * Get profile statistics
 */
export const getProfileStats = async (userId: string) => {
    const profile = await prisma.profile.findUnique({
        where: { userId },
    });

    if (!profile) {
        throw new Error('Profile not found');
    }

    // Get various stats
    const [viewCount, likeCount, mutualLikes, savedCount] = await Promise.all([
        prisma.profileView.count({
            where: { viewedId: userId },
        }),
        prisma.like.count({
            where: { likedUserId: userId },
        }),
        prisma.like.count({
            where: { likedUserId: userId, isMutual: true },
        }),
        prisma.savedProfile.count({
            where: { savedUserId: userId },
        }),
    ]);

    return {
        profileCompleteness: profile.profileCompleteness,
        viewCount: profile.viewCount,
        likeCount: profile.likeCount,
        mutualLikes,
        savedCount,
        photoCount: await prisma.photo.count({ where: { profileId: profile.id } }),
    };
};

/**
 * Delete account
 */
export const deleteAccount = async (userId: string) => {
    // Get all photos
    const profile = await prisma.profile.findUnique({
        where: { userId },
        include: { photos: true },
    });

    if (profile) {
        // Delete all photos from storage
        for (const photo of profile.photos) {
            await deleteImage(photo.publicId, photo.url).catch(console.error);
        }
    }

    // Delete user (cascade will delete profile and related data)
    await prisma.user.delete({
        where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
};
