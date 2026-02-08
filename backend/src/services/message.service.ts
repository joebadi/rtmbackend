import { prisma } from '../server';
import { SendMessageInput } from '../validators/message.validator';

/**
 * Send a message
 */
export const sendMessage = async (senderId: string, data: SendMessageInput) => {
    const { receiverId, content } = data;

    // Check if users are matched (mutual like)
    const areMutualLikes = await prisma.like.findFirst({
        where: {
            OR: [
                { likerId: senderId, likedUserId: receiverId, isMutual: true },
                { likerId: receiverId, likedUserId: senderId, isMutual: true },
            ],
        },
    });

    // Find existing conversation between these two users
    let conversation = await prisma.conversation.findFirst({
        where: {
            AND: [
                {
                    participants: {
                        some: {
                            userId: senderId,
                        },
                    },
                },
                {
                    participants: {
                        some: {
                            userId: receiverId,
                        },
                    },
                },
            ],
        },
        include: {
            participants: true,
            messages: true,
        },
    });

    // HYBRID LOGIC: Check intro message rules
    if (!areMutualLikes) {
        // If conversation exists and already has intro message, block
        if (conversation && conversation.hasIntroMessage) {
            throw new Error('You need to match with this user to continue chatting');
        }
        // If no conversation or no intro sent yet, allow (this is the intro message)
    }

    if (!conversation) {
        // Create new conversation
        conversation = await prisma.conversation.create({
            data: {
                hasIntroMessage: !areMutualLikes, // Mark intro if not matched
                participants: {
                    create: [
                        { userId: senderId },
                        { userId: receiverId },
                    ],
                },
            },
            include: {
                participants: true,
                messages: true,
            },
        });
    } else if (!areMutualLikes && !conversation.hasIntroMessage) {
        // Update existing conversation to mark intro sent
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { hasIntroMessage: true },
        });
    }

    // Create message
    const message = await prisma.message.create({
        data: {
            conversationId: conversation.id,
            senderId,
            receiverId,
            messageType: 'TEXT',
            content,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    profile: {
                        select: {
                            firstName: true,
                            photos: {
                                where: { isPrimary: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });

    // Update unread count for receiver
    await prisma.conversationParticipant.updateMany({
        where: {
            conversationId: conversation.id,
            userId: receiverId,
        },
        data: {
            unreadCount: { increment: 1 },
        },
    });

    // Create notification
    await prisma.notification.create({
        data: {
            userId: receiverId,
            type: 'NEW_MESSAGE',
            title: 'New Message',
            body: content.substring(0, 100),
            data: { senderId },
        },
    });

    return message;
};

/**
 * Get user's conversations
 */
export const getConversations = async (userId: string, limit: number = 20, offset: number = 0) => {
    const conversations = await prisma.conversation.findMany({
        where: {
            participants: {
                some: {
                    userId,
                },
            },
        },
        include: {
            participants: {
                where: {
                    userId: { not: userId },
                },
                include: {
                    user: {
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
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
            _count: {
                select: {
                    messages: true,
                },
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
        take: limit,
        skip: offset,
    });

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
        conversations.map(async (conversation) => {
            const participant = await prisma.conversationParticipant.findFirst({
                where: {
                    conversationId: conversation.id,
                    userId,
                },
            });

            return {
                ...conversation,
                unreadCount: participant?.unreadCount || 0,
            };
        })
    );

    return conversationsWithUnread;
};

/**
 * Get messages in a conversation
 */
export const getMessages = async (
    userId: string,
    conversationId: string,
    limit: number = 50,
    offset: number = 0
) => {
    // Verify user is part of conversation
    const participant = await prisma.conversationParticipant.findFirst({
        where: {
            conversationId,
            userId,
        },
    });

    if (!participant) {
        throw new Error('You are not part of this conversation');
    }

    const messages = await prisma.message.findMany({
        where: {
            conversationId,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    profile: {
                        select: {
                            firstName: true,
                            photos: {
                                where: { isPrimary: true },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
        skip: offset,
    });

    return messages.reverse(); // Return in chronological order
};

/**
 * Mark messages as read
 */
export const markAsRead = async (userId: string, conversationId: string) => {
    // Verify user is part of conversation
    const participant = await prisma.conversationParticipant.findFirst({
        where: {
            conversationId,
            userId,
        },
    });

    if (!participant) {
        throw new Error('You are not part of this conversation');
    }

    // Mark all unread messages as read
    await prisma.message.updateMany({
        where: {
            conversationId,
            receiverId: userId,
            isRead: false,
        },
        data: {
            isRead: true,
            readAt: new Date(),
        },
    });

    // Reset unread count
    await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { unreadCount: 0 },
    });

    return {
        message: 'Messages marked as read',
    };
};

/**
 * Delete a message (simplified - just delete from DB)
 */
export const deleteMessage = async (
    userId: string,
    messageId: string,
    deleteForEveryone: boolean = false
) => {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
    });

    if (!message) {
        throw new Error('Message not found');
    }

    // Only sender can delete
    if (message.senderId !== userId) {
        throw new Error('You can only delete your own messages');
    }

    // Delete the message
    await prisma.message.delete({
        where: { id: messageId },
    });

    return {
        message: 'Message deleted successfully',
    };
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (userId: string) => {
    const participants = await prisma.conversationParticipant.findMany({
        where: { userId },
    });

    const totalUnread = participants.reduce((sum, p) => sum + p.unreadCount, 0);

    return {
        totalUnread,
        conversations: participants.length,
    };
};

/**
 * Search messages
 */
export const searchMessages = async (
    userId: string,
    query: string,
    limit: number = 20
) => {
    // Get user's conversations
    const userConversations = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
    });

    const conversationIds = userConversations.map((c) => c.conversationId);

    // Search messages
    const messages = await prisma.message.findMany({
        where: {
            conversationId: { in: conversationIds },
            content: {
                contains: query,
                mode: 'insensitive',
            },
        },
        include: {
            sender: {
                select: {
                    id: true,
                    profile: {
                        select: {
                            firstName: true,
                        },
                    },
                },
            },
            conversation: {
                include: {
                    participants: {
                        where: { userId: { not: userId } },
                        include: {
                            user: {
                                include: {
                                    profile: {
                                        select: {
                                            firstName: true,
                                            photos: {
                                                where: { isPrimary: true },
                                                take: 1,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: limit,
    });

    return messages;
};

/**
 * Block user (prevent messaging)
 */
export const blockUser = async (blockerId: string, blockedUserId: string) => {
    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
        where: {
            blockerId_blockedUserId: {
                blockerId,
                blockedUserId,
            },
        },
    });

    if (existingBlock) {
        throw new Error('User is already blocked');
    }

    // Create block
    const block = await prisma.block.create({
        data: {
            blockerId,
            blockedUserId,
        },
    });

    return {
        message: 'User blocked successfully',
        block,
    };
};

/**
 * Unblock user
 */
export const unblockUser = async (blockerId: string, blockedUserId: string) => {
    const block = await prisma.block.findUnique({
        where: {
            blockerId_blockedUserId: {
                blockerId,
                blockedUserId,
            },
        },
    });

    if (!block) {
        throw new Error('User is not blocked');
    }

    await prisma.block.delete({
        where: { id: block.id },
    });

    return {
        message: 'User unblocked successfully',
    };
};
