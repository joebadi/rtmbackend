
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyData() {
    try {
        console.log('🔍 Connecting to database...');

        // precise count
        const count = await prisma.user.count();
        console.log(`📊 Total Users: ${count}`);

        if (count === 0) {
            console.log('❌ No users found in database.');
            return;
        }

        // Get latest user
        const user = await prisma.user.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                profile: true,
                matchPreferences: true,
                photos: true,
            },
        });

        if (!user) {
            console.log('❌ Failed to fetch latest user.');
            return;
        }

        console.log('\n✅ LATEST USER RECORD Found:');
        console.log('User ID:', user.id);
        console.log('Email:', user.email);
        console.log('Phone:', user.phoneNumber);
        console.log('Verified:', user.isVerified ? 'YES' : 'NO');

        console.log('\n👤 PROFILE DATA:');
        if (user.profile) {
            console.log('Gender:', user.profile.gender); // Enum stored?
            console.log('Location:', user.profile.location);
            console.log('Geolocation:', user.profile.latitude, user.profile.longitude);
            console.log('Bio:', user.profile.bio);
            console.log('Tribe:', user.profile.tribe);
        } else {
            console.log('⚠️  NO PROFILE DATA FOUND!');
        }

        console.log('\n❤️  MATCH PREFERENCES:');
        if (user.matchPreferences) {
            console.log('Age Range:', user.matchPreferences.ageMin, '-', user.matchPreferences.ageMax);
            console.log('Countries:', user.matchPreferences.locationCountry);
            console.log('Tribes:', user.matchPreferences.locationTribes);
            console.log('Deal Breakers:', {
                location: user.matchPreferences.locationIsDealBreaker,
                religion: user.matchPreferences.religionIsDealBreaker,
            });
        } else {
            console.log('⚠️  NO MATCH PREFERENCES FOUND!');
        }

        console.log('\n📸 PHOTOS:');
        if (user.photos && user.photos.length > 0) {
            user.photos.forEach((p, i) => {
                console.log(`[${i + 1}] ${p.url} (Primary: ${p.isPrimary})`);
            });
        } else {
            console.log('⚠️  NO PHOTOS FOUND!');
        }

    } catch (error) {
        console.error('❌ Error verifying data:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

verifyData();
