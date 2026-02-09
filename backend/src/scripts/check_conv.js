const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    try {
        const user1 = await prisma.user.findUnique({
            where: { email: 'joeloso21@gmail.com' },
            select: { id: true, email: true }
        });
        const user2 = await prisma.user.findUnique({
            where: { email: 'kolbe_joe@yahoo.com' },
            select: { id: true, email: true }
        });

        if (!user1 || !user2) {
            console.log('Users not found');
            console.log('User 1:', user1 ? 'Found' : 'NOT FOUND');
            console.log('User 2:', user2 ? 'Found' : 'NOT FOUND');
            await prisma.$disconnect();
            return;
        }

        console.log('User 1:', user1.email, '-', user1.id);
        console.log('User 2:', user2.email, '-', user2.id);

        const conv = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { userId: user1.id } } },
                    { participants: { some: { userId: user2.id } } }
                ]
            },
            include: {
                participants: true,
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: { select: { email: true } }
                    }
                }
            }
        });

        if (!conv) {
            console.log('\nNo conversation found');
        } else {
            console.log('\nConversation ID:', conv.id);
            console.log('Has intro:', conv.hasIntroMessage);
            console.log('Participants:', conv.participants.length);
            conv.participants.forEach(p => {
                console.log('  -', p.userId, 'unread:', p.unreadCount);
            });
            console.log('Messages:', conv.messages.length);
            conv.messages.forEach((m, i) => {
                console.log(`  ${i + 1}. From ${m.sender.email}: ${m.content.substring(0, 50)}`);
            });
        }

        await prisma.$disconnect();
    } catch (e) {
        console.error('Error:', e.message);
        await prisma.$disconnect();
    }
})();
