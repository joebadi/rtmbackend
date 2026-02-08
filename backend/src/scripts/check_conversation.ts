import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConversation() {
    const conversationId = process.argv[2];

    if (!conversationId) {
        console.log('Usage: ts-node check_conversation.ts <conversationId>');
        process.exit(1);
    }

    console.log('Checking conversation:', conversationId);

    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    firstName: true,
                                },
                            },
                        },
                    },
                },
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 5,
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
                },
            },
        },
    });

    if (!conversation) {
        console.log('❌ Conversation not found');
        process.exit(1);
    }

    console.log('\n✅ Conversation found:');
    console.log('ID:', conversation.id);
    console.log('Has intro message:', conversation.hasIntroMessage);
    console.log('Created:', conversation.createdAt);
    console.log('\nParticipants:');
    conversation.participants.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.user.profile?.firstName || 'Unknown'} (${p.userId})`);
        console.log(`     Unread count: ${p.unreadCount}`);
    });

    console.log(`\nMessages (${conversation.messages.length}):`);
    conversation.messages.forEach((m, i) => {
        console.log(`  ${i + 1}. From: ${m.sender.profile?.firstName || 'Unknown'}`);
        console.log(`     Content: ${m.content.substring(0, 50)}...`);
        console.log(`     Created: ${m.createdAt}`);
    });

    await prisma.$disconnect();
}

checkConversation().catch(console.error);
