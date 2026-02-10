import { prisma } from '../server';
import { SendLikeInput } from '../validators/like.validator';
import { NotificationService } from './notification.service';

/**
 * Send a like to another user
 */
export const sendLike = async (likerId: string, data: SendLikeInput) => {
    const { likedUserId } = data;

    // Check if user is trying to like themselves
    if (likerId === likedUserId) {
        throw new Error('You cannot like yourself');
    }

    // Check if target user exists and profile is active
    const targetProfile = await prisma.profile.findUnique({
        where: { userId: likedUserId },
    });

    if (!targetProfile || !targetProfile.isActive || targetProfile.isBanned) {
        throw new Error('User not found or not available');
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
        where: {
            likerId_likedUserId: {
                likerId,
                likedUserId,
            },
        },
    });

    if (existingLike) {
        throw new Error('You have already liked this user');
    }

    // Check if the other user has liked this user (mutual like)
    const reverseLike = await prisma.like.findUnique({
        where: {
            likerId_likedUserId: {
                likerId: likedUserId,
                likedUserId: likerId,
            },
        },
    });

    const isMutual = !!reverseLike;

    // Create the like
    const like = await prisma.like.create({
        data: {
            likerId,
            likedUserId,
            isMutual,
        },
    });

    // If mutual, update the reverse like as well
    if (isMutual && reverseLike) {
        await prisma.like.update({
            where: { id: reverseLike.id },
            data: { isMutual: true },
        });

        // Create a conversation for mutual likes
        await createConversationForMatch(likerId, likedUserId);
    }

    // Increment like count on profile
    await prisma.profile.update({
        where: { userId: likedUserId },
        data: { likeCount: { increment: 1 } },
    });

    // Create notifications with real-time socket delivery
    if (isMutual) {
        // Notify both users about the match
        await NotificationService.createNotification(
            likedUserId,
            'MUTUAL_MATCH',
            "It's a Match!",
            'You have a new match! Start chatting now.',
            { relatedUserId: likerId }
        );
        await NotificationService.createNotification(
            likerId,
            'MUTUAL_MATCH',
            "It's a Match!",
            'You have a new match! Start chatting now.',
            { relatedUserId: likedUserId }
        );
    } else {
        // Notify the liked user about the new like
        await NotificationService.createNotification(
            likedUserId,
            'NEW_LIKE',
            'New Like',
            'Someone liked your profile.',
            { relatedUserId: likerId }
        );
    }

    return {
        like,
        isMutual,
        message: isMutual ? "It's a match!" : 'Like sent successfully',
    };
};

/**
 * Create conversation for mutual match
 */
const createConversationForMatch = async (user1Id: string, user2Id: string) => {
    // Check if conversation already exists between these two users
    const existingConversation = await prisma.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { userId: user1Id } } },
                { participants: { some: { userId: user2Id } } },
            ],
        },
    });

    if (existingConversation) {
        // If conversation was created via icebreaker, mark it as matched now
        if (existingConversation.hasIntroMessage) {
            await prisma.conversation.update({
                where: { id: existingConversation.id },
                data: { hasIntroMessage: false },
            });
        }
        return existingConversation;
    }

    // Create new conversation (matched users, no intro restriction)
    const conversation = await prisma.conversation.create({
        data: {
            hasIntroMessage: false,
            participants: {
                create: [
                    { userId: user1Id },
                    { userId: user2Id },
                ],
            },
        },
    });

    return conversation;
};

/**
 * Unlike a user
 */
export const unlikeUser = async (likerId: string, likedUserId: string) => {
    const like = await prisma.like.findUnique({
        where: {
            likerId_likedUserId: {
                likerId,
                likedUserId,
            },
        },
    });

    if (!like) {
        throw new Error('Like not found');
    }

    // If it was mutual, update the reverse like
    if (like.isMutual) {
        await prisma.like.updateMany({
            where: {
                likerId: likedUserId,
                likedUserId: likerId,
            },
            data: { isMutual: false },
        });
    }

    // Delete the like
    await prisma.like.delete({
        where: { id: like.id },
    });

    // Decrement like count
    await prisma.profile.update({
        where: { userId: likedUserId },
        data: { likeCount: { decrement: 1 } },
    });

    return {
        message: 'Like removed successfully',
    };
};

/**
 * Get likes sent by user
 */
export const getSentLikes = async (userId: string, limit: number = 20, offset: number = 0) => {
    const likes = await prisma.like.findMany({
        where: { likerId: userId },
        include: {
            likedUser: {
                include: {
                    profile: {
                        include: {
                            photos: {
                                where: { isPrimary: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });

    return likes;
};

/**
 * Get likes received by user
 */
export const getReceivedLikes = async (userId: string, limit: number = 20, offset: number = 0) => {
    const likes = await prisma.like.findMany({
        where: { likedUserId: userId },
        include: {
            liker: {
                include: {
                    profile: {
                        include: {
                            photos: {
                                where: { isPrimary: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });

    return likes;
};

/**
 * Get mutual likes (matches)
 */
export const getMutualLikes = async (userId: string, limit: number = 20, offset: number = 0) => {
    const likes = await prisma.like.findMany({
        where: {
            likerId: userId,
            isMutual: true,
        },
        include: {
            likedUser: {
                include: {
                    profile: {
                        include: {
                            photos: {
                                where: { isPrimary: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });

    return likes;
};

/**
 * Check if user has liked another user
 */
export const checkIfLiked = async (likerId: string, likedUserId: string) => {
    const like = await prisma.like.findUnique({
        where: {
            likerId_likedUserId: {
                likerId,
                likedUserId,
            },
        },
    });

    return {
        hasLiked: !!like,
        isMutual: like?.isMutual || false,
    };
};

/**
 * Get like statistics
 */
export const getLikeStats = async (userId: string) => {
    const [sentCount, receivedCount, mutualCount] = await Promise.all([
        prisma.like.count({ where: { likerId: userId } }),
        prisma.like.count({ where: { likedUserId: userId } }),
        prisma.like.count({ where: { likerId: userId, isMutual: true } }),
    ]);

    return {
        sent: sentCount,
        received: receivedCount,
        mutual: mutualCount,
    };
};
