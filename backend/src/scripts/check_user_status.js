const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'joeloso21@gmail.com';
    console.log(`Checking user with email: ${email}`);

    const user = await prisma.user.findFirst({
        where: { email: email },
        select: {
            id: true,
            email: true,
            phoneNumber: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            profile: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true
                }
            }
        },
    });

    if (user) {
        console.log('User found:', JSON.stringify(user, null, 2));
    } else {
        console.log('User not found');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
