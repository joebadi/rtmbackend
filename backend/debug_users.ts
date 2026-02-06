import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const users = await prisma.user.findMany({
        include: { profile: true },
    });

    console.log(JSON.stringify(users.map(u => ({
        email: u.email,
        id: u.id,
        gender: u.profile?.gender,
        country: u.profile?.country,
        state: u.profile?.state, // Added state for more info
        lat: u.profile?.latitude,
        lng: u.profile?.longitude,
        showOnMap: u.profile?.showOnMap
    })), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
