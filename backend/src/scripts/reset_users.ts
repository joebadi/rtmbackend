import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetUsers() {
    try {
        console.log('Resetting regular users (keeping admins)...');

        // Safety check: Ensure we don't accidentally delete admins if they were in the same table
        // But since AdminUser is a separate model, filtering isn't strictly necessary on User table 
        // unless the schema has changed.
        // Based on middleware, AdminUser is separate.

        // Delete all Users
        const { count } = await prisma.user.deleteMany({});

        console.log(`Successfully deleted ${count} regular users.`);

    } catch (error) {
        console.error('Error resetting users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetUsers();
