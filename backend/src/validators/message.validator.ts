import { z } from 'zod';

/**
 * Send message validation schema
 */
export const sendMessageSchema = z.object({
    receiverId: z.string().uuid('Invalid receiver ID'),
    content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Get messages validation schema
 */
export const getMessagesSchema = z.object({
    conversationId: z.string().uuid('Invalid conversation ID'),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
});

export type GetMessagesInput = z.infer<typeof getMessagesSchema>;

/**
 * Mark messages as read validation schema
 */
export const markAsReadSchema = z.object({
    conversationId: z.string().uuid('Invalid conversation ID'),
});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

/**
 * Delete message validation schema
 */
export const deleteMessageSchema = z.object({
    messageId: z.string().uuid('Invalid message ID'),
    deleteForEveryone: z.boolean().default(false),
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;
