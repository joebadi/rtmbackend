import { prisma } from '../server';

async function checkUserConversation() {
    const email1 = 'joeloso21@gmail.com';
    const email2 = 'kolbe_joe@yahoo.com';

    console.log('Finding users...');
    const user1 = await prisma.user.findUnique({
        where: { email: email1 },
        select: { id: true, email: true, profile: { select: { firstName: true } } }
    });
    const user2 = await prisma.user.findUnique({
        where: { email: email2 },
        select: { id: true, email: true, profile: { select: { firstName: true } } }
    });

    if (!user1 || !user2) {
        console.log('❌ Users not found');
        console.log('User 1:', user1 ? '✅' : '❌', email1);
        console.log('User 2:', user2 ? '✅' : '❌', email2);
        await prisma.$disconnect();
        return;
    }

    console.log('\n✅ Users found:');
    console.log(`1. ${user1.profile?.firstName} (${user1.id})`);
    console.log(`2. ${user2.profile?.firstName} (${user2.id})`);

    console.log('\nFinding conversation...');
    const conversation = await prisma.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { userId: user1.id } } },
                { participants: { some: { userId: user2.id } } }
            ]
        },
        include: {
            participants: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: { select: { firstName: true } }
                        }
                    }
                }
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                include: {
                    sender: {
                        select: {
                            id: true,
                            email: true,
                            profile: { select: { firstName: true } }
                        }
                    }
                }
            }
        }
    });

    if (!conversation) {
        console.log('❌ No conversation found between these users');
        await prisma.$disconnect();
        return;
    }

    console.log('\n✅ Conversation found:');
    console.log('ID:', conversation.id);
    console.log('Has intro message:', conversation.hasIntroMessage);
    console.log('Created:', conversation.createdAt);
    console.log('Updated:', conversation.updatedAt);

    console.log('\n📋 Participants:');
    conversation.participants.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.user.profile?.firstName || 'Unknown'} (${p.user.email})`);
        console.log(`     User ID: ${p.userId}`);
        console.log(`     Unread count: ${p.unreadCount}`);
    });

    console.log(`\n💬 Messages (${conversation.messages.length} total):`);
    if (conversation.messages.length === 0) {
        console.log('  No messages in this conversation');
    } else {
        conversation.messages.reverse().forEach((m, i) => {
            console.log(`\n  ${i + 1}. From: ${m.sender.profile?.firstName || 'Unknown'} (${m.sender.email})`);
            console.log(`     To: ${m.receiverId}`);
            console.log(`     Content: "${m.content}"`);
            console.log(`     Type: ${m.messageType}`);
            console.log(`     Created: ${m.createdAt}`);
        });
    }

    await prisma.$disconnect();
}

checkUserConversation().catch(console.error);
