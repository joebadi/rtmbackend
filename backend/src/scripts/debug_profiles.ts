
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Profiles ---');

    const profiles = await prisma.profile.findMany({
        select: {
            userId: true,
            firstName: true,
            country: true,
            state: true,
            showOnMap: true,
            isActive: true,
            isBanned: true,
            latitude: true,
            longitude: true,
        }
    });

    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(p => {
        console.log(JSON.stringify(p, null, 2));
    });

    // Check unique countries
    const countries = [...new Set(profiles.map(p => p.country))];
    console.log('Unique Countries:', countries);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
