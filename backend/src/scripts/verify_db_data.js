
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

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

        // Get specific user
        const user = await prisma.user.findFirst({
            where: { email: 'joeloso21@gmail.com' }, // Target specific user
            include: {
                profile: {
                    include: { photos: true }
                },
                matchPreferences: true,
            },
        });

        if (!user) {
            console.log('❌ User joeloso21@gmail.com not found.');
            return;
        }

        console.log('\n✅ USER RECORD Found:');
        console.log('User ID:', user.id);
        console.log('Email:', user.email);
        console.log('Phone:', user.phoneNumber);
        console.log('Email Verified:', user.isEmailVerified);
        console.log('Phone Verified:', user.isPhoneVerified);

        console.log('\n👤 PROFILE DATA:');
        if (user.profile) {
            console.log('FirstName:', user.profile.firstName);
            console.log('LastName:', user.profile.lastName);
            console.log('DateOfBirth:', user.profile.dateOfBirth);
            console.log('Location:', user.profile.location); // Added back
            console.log('Gender:', user.profile.gender);
            console.log('AboutMe:', user.profile.aboutMe);
            console.log('Bio (Legacy):', user.profile.bio);
        } else {
            console.log('⚠️  NO PROFILE DATA FOUND!');
        }

        console.log('\n❤️  MATCH PREFERENCES:');
        if (user.matchPreferences) {
            console.log('Age Range:', user.matchPreferences.ageMin, '-', user.matchPreferences.ageMax);
            console.log(user.matchPreferences);
        } else {
            console.log('⚠️  NO MATCH PREFERENCES FOUND!');
        }

        console.log('\n📸 PHOTOS:');
        if (user.profile && user.profile.photos && user.profile.photos.length > 0) {
            user.profile.photos.forEach((p, i) => {
                console.log(`[${i + 1}] ${p.url} (Primary: ${p.isPrimary})`);
            });
        } else {
            console.log('⚠️  NO PHOTOS FOUND (Check if user uploaded one?)');
        }

    } catch (error) {
        console.error('❌ Error verifying data:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

verifyData();
