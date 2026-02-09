import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize Prisma with adapter for Prisma 7
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Deleting all users...');
    try {
        await prisma.$connect();
        // Delete related data first if cascade delete isn't set up, but usually User is top level.
        // However, if there are other tables like Profile, OTP, etc. they might need deletion or Cascade.
        // Assuming schema handles cascade or we just delete User.
        const result = await prisma.user.deleteMany({});
        console.log(`Deleted ${result.count} users successfully.`);
    } catch (error) {
        console.error('Error deleting users:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
