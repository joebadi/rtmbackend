/**
 * User-join simulator (TEST DATA for our own app).
 *
 * Creates the target account (thistyscholar) with a fixed Preferred-Match
 * profile, then adds `isTest` female users based in Delta State, engineered to
 * hit specific compatibility buckets against the target. Photos come from our
 * own local mock set in backend/uploads/mock. Each join triggers the proactive
 * match-notification pipeline (in-app + push + email).
 *
 * Run (from backend/, after building):
 *   node dist/scripts/simulate_users.js            # ~30 users, one burst, emails on
 *   node dist/scripts/simulate_users.js 100        # 100 users
 *   node dist/scripts/simulate_users.js drip       # small random batch, emails OFF, capped
 *   node dist/scripts/simulate_users.js --clean     # delete ALL isTest users
 *
 * Env: SIM_TARGET_PASSWORD, SIM_MAX_TEST_USERS (drip cap, default 300).
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { notifyExistingUsersOfNewProfile } from '../services/match-notify.service';

const TARGET_EMAIL = 'thistyscholar@yahoo.com';
const TARGET_PASSWORD = process.env.SIM_TARGET_PASSWORD || 'Password123!';
const MOCK_DIR = path.resolve(process.cwd(), 'uploads', 'mock');
const IMAGE_EXT = /\.(jpe?g|png|webp|jfif)$/i;
const DRIP_CAP = parseInt(process.env.SIM_MAX_TEST_USERS || '300', 10);

// ---- data pools -----------------------------------------------------------
const FIRST_NAMES = [
    'Chioma', 'Ngozi', 'Ada', 'Ifeoma', 'Blessing', 'Amaka', 'Ebele', 'Nkechi',
    'Chinyere', 'Efe', 'Tega', 'Voke', 'Ese', 'Onome', 'Rukevwe', 'Mercy',
    'Grace', 'Peace', 'Joy', 'Gift', 'Faith', 'Precious', 'Stella', 'Uche',
    'Nneka', 'Chidinma', 'Adaeze', 'Oluchi', 'Funke', 'Bukola', 'Yetunde',
    'Kemi', 'Sade', 'Bisi', 'Zainab', 'Aisha', 'Halima', 'Rita', 'Titi', 'Oghenekaro',
];
const LAST_NAMES = [
    'Okafor', 'Okonkwo', 'Eze', 'Nwosu', 'Obi', 'Okoro', 'Emeka', 'Okoye',
    'Tobore', 'Oghene', 'Mudiaga', 'Efemena', 'Onobrakpeya', 'Ogboru', 'Ekwueme',
    'Adeyemi', 'Balogun', 'Ogunleye', 'Ibrahim', 'Musa', 'Bello',
];
const ORIGIN_STATES = [
    'Delta', 'Edo', 'Anambra', 'Imo', 'Enugu', 'Rivers', 'Lagos', 'Oyo', 'Kaduna',
    'Cross River', 'Akwa Ibom', 'Ondo', 'Abia', 'Ebonyi', 'Bayelsa',
];
const TRIBES = [
    'Urhobo', 'Isoko', 'Ijaw', 'Itsekiri', 'Igbo', 'Yoruba', 'Bini', 'Esan',
    'Efik', 'Ibibio', 'Ika', 'Anioma', 'Hausa',
];
const DELTA_CITIES: [string, number, number][] = [
    ['Asaba', 6.1980, 6.7300], ['Warri', 5.5167, 5.7500], ['Ughelli', 5.5000, 6.0000],
    ['Sapele', 5.8940, 5.6760], ['Agbor', 6.2500, 6.1930], ['Effurun', 5.5560, 5.7570],
    ['Oleh', 5.4700, 6.2000], ['Abraka', 5.7900, 6.1000],
];
const HEIGHTS = ['5\'0"', '5\'2"', '5\'4"', '5\'5"', '5\'6"', '5\'7"', '5\'8"', '5\'10"'];
const SKIN = ['Dark', 'Chocolate', 'Brown', 'Fair', 'Ebony'];
const OTHER_BODY = ['Curvy', 'Athletic', 'Plus-size', 'Slim-thick'];

type Bucket = 'perfect' | 'strong' | 'good' | 'borderline' | 'excluded';

const rand = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function zodiacSign(d: Date): string {
    const day = d.getUTCDate();
    const m = d.getUTCMonth() + 1;
    const cut = [20, 19, 20, 20, 21, 21, 22, 22, 23, 23, 22, 21];
    const names = ['Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
        'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius'];
    return day < cut[m - 1] ? names[m - 1] : names[m % 12];
}

/**
 * Group the mock images in [gender] into per-person sets:
 *  - "img4" + "img4-1"  → one person (trailing -N are extra shots)
 *  - "first-last-HASH-unsplash" → keyed by "first-last"
 */
function groupImages(gender: 'female' | 'male'): string[][] {
    const dir = path.join(MOCK_DIR, gender);
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => IMAGE_EXT.test(f));
    const groups = new Map<string, string[]>();
    for (const f of files) {
        const name = f.replace(IMAGE_EXT, '');
        let key: string;
        if (/-unsplash$/i.test(name)) {
            const parts = name.split('-');
            key = parts.slice(0, Math.max(1, parts.length - 2)).join('-');
        } else {
            key = name.replace(/-\d+$/, '');
        }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(f);
    }
    return [...groups.values()].map((list) =>
        list.sort((a, b) => a.length - b.length || a.localeCompare(b))
            .map((f) => `/uploads/mock/${gender}/${f}`)
    );
}

function engineer(bucket: Bucket) {
    let religion = 'Christianity';
    let genotype = 'AA';
    let bodyType: string = rand(['Slim', 'Average']);
    let hasTattoos = false;
    const age = randInt(24, 34);
    switch (bucket) {
        case 'perfect': break;
        case 'strong': hasTattoos = true; break;
        case 'good': bodyType = rand(OTHER_BODY); break;
        case 'borderline': religion = 'Islam'; break;
        case 'excluded': genotype = 'AS'; break;
    }
    return { religion, genotype, bodyType, hasTattoos, age };
}

function pickBucket(index: number): Bucket {
    if (index < 4) return 'perfect';
    const roll = Math.random();
    if (roll < 0.28) return 'strong';
    if (roll < 0.56) return 'good';
    if (roll < 0.82) return 'borderline';
    return 'excluded';
}

async function setGeo(profileId: string, lng: number, lat: number) {
    await prisma.$executeRawUnsafe(
        `UPDATE profiles SET location = ST_SetSRID(ST_MakePoint($1,$2),4326) WHERE id = $3`,
        lng, lat, profileId
    );
}

/** Count female test profiles (excludes the male target). */
async function countFemaleSims(): Promise<number> {
    return prisma.user.count({ where: { isTest: true, profile: { gender: 'FEMALE' } } });
}

/**
 * Create one simulated female user (bucketed by [index]) and fire match
 * notifications. [sendEmail] controls whether the target gets a match email.
 */
async function spawnUser(
    index: number,
    imageGroups: string[][],
    sendEmail: boolean
): Promise<{ bucket: Bucket; notified: number; name: string; city: string; photos: number } | null> {
    const bucket = pickBucket(index);
    const eng = engineer(bucket);
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const [city, lat, lng] = rand(DELTA_CITIES);
    const jitter = () => (Math.random() - 0.5) * 0.05;
    const dob = new Date(Date.UTC(new Date().getUTCFullYear() - eng.age, randInt(0, 11), randInt(1, 28)));
    const email = `sim.${first.toLowerCase()}.${Date.now()}${index}@example.com`;
    const phone = `+234${randInt(700, 909)}${String(randInt(1000000, 9999999)).padStart(7, '0')}`;
    const photos = imageGroups[index % imageGroups.length];

    try {
        const user = await prisma.user.create({
            data: {
                email, phoneNumber: phone,
                password: await bcrypt.hash('SimPass123!', 10),
                isEmailVerified: true, isPhoneVerified: true, isTest: true,
                profile: {
                    create: {
                        firstName: first, lastName: last, dateOfBirth: dob, age: eng.age,
                        gender: 'FEMALE', zodiacSign: zodiacSign(dob), country: 'Nigeria',
                        state: 'Delta', city, latitude: lat + jitter(), longitude: lng + jitter(),
                        stateOfOrigin: rand(ORIGIN_STATES), tribe: rand(TRIBES),
                        religion: eng.religion, genotype: eng.genotype, bodyType: eng.bodyType,
                        height: rand(HEIGHTS), skinColor: rand(SKIN), hasTattoos: eng.hasTattoos,
                        aboutMe: 'Simulated test profile.', profileCompleteness: 90, isActive: true,
                        photos: {
                            create: photos.map((url, idx) => ({
                                url, publicId: `mock_${index}_${idx}`, isPrimary: idx === 0, isVerified: true,
                            })),
                        },
                    },
                },
                matchPreferences: {
                    create: {
                        ageMin: 27, ageMax: 40, locationStates: ['Delta'], locationTribes: [],
                        religion: [], genotype: [], bodyType: [], zodiac: [], bloodGroup: [],
                        relationshipStatus: [],
                    },
                },
            },
            include: { profile: true },
        });
        if (user.profile) await setGeo(user.profile.id, lng, lat);
        const notified = await notifyExistingUsersOfNewProfile(user.id, { email: sendEmail });
        return { bucket, notified, name: `${first} ${last}`, city, photos: photos.length };
    } catch (e: any) {
        console.warn(`  ⚠️ skip ${first} ${last}: ${e?.message || e}`);
        return null;
    }
}

async function ensureTarget(): Promise<string> {
    const existing = await prisma.user.findFirst({
        where: { email: { equals: TARGET_EMAIL, mode: 'insensitive' } },
    });
    if (existing) {
        console.log(`✔ Target ${TARGET_EMAIL} already exists (${existing.id}).`);
        return existing.id;
    }
    const dob = new Date(Date.UTC(1994, 4, 12));
    const user = await prisma.user.create({
        data: {
            email: TARGET_EMAIL, phoneNumber: '+2348030000001',
            password: await bcrypt.hash(TARGET_PASSWORD, 10),
            isEmailVerified: true, isPhoneVerified: true, isTest: true,
            profile: {
                create: {
                    firstName: 'Thisty', lastName: 'Scholar', dateOfBirth: dob, age: 31,
                    gender: 'MALE', zodiacSign: zodiacSign(dob), country: 'Nigeria',
                    state: 'Delta', city: 'Asaba', latitude: 6.1980, longitude: 6.7300,
                    stateOfOrigin: 'Delta', tribe: 'Urhobo', religion: 'Christianity',
                    bodyType: 'Athletic', height: '5\'11"', genotype: 'AA',
                    profileCompleteness: 90, isActive: true,
                },
            },
            matchPreferences: {
                create: {
                    ageMin: 24, ageMax: 34, ageIsDealBreaker: false,
                    locationCountry: 'Nigeria', locationStates: ['Delta'], locationTribes: [],
                    locationIsDealBreaker: false,
                    religion: ['Christianity'], religionIsDealBreaker: false,
                    genotype: ['AA'], genotypeIsDealBreaker: true,
                    bodyType: ['Slim', 'Average'], bodyTypeIsDealBreaker: false,
                    tattoosAcceptable: false, tattoosIsDealBreaker: false,
                    zodiac: [], bloodGroup: [], relationshipStatus: [],
                },
            },
        },
    });
    console.log(`✅ Created target (login: ${TARGET_EMAIL} / ${TARGET_PASSWORD})`);
    return user.id;
}

async function clean() {
    const res = await prisma.user.deleteMany({ where: { isTest: true } });
    console.log(`🧹 Deleted ${res.count} test users (isTest=true).`);
}

// ---- main -----------------------------------------------------------------
async function main() {
    const arg = process.argv[2];

    if (arg === '--clean') {
        await clean();
        await prisma.$disconnect();
        return;
    }

    const imageGroups = groupImages('female');
    if (imageGroups.length === 0) {
        console.error(`No mock images found in ${path.join(MOCK_DIR, 'female')}`);
        await prisma.$disconnect();
        process.exit(1);
    }
    await ensureTarget();

    // ----- Scheduled trickle: small capped batch, emails suppressed. --------
    if (arg === 'drip') {
        const existing = await countFemaleSims();
        if (existing >= DRIP_CAP) {
            console.log(`[drip] cap reached (${existing}/${DRIP_CAP}); nothing added.`);
            await prisma.$disconnect();
            return;
        }
        // Feel organic: sometimes a quiet run, otherwise add 1–3 (within cap).
        if (Math.random() < 0.25) {
            console.log('[drip] quiet run — no users added this cycle.');
            await prisma.$disconnect();
            return;
        }
        const batch = Math.min(randInt(1, 3), DRIP_CAP - existing);
        console.log(`[drip] adding ${batch} user(s) (total ${existing}/${DRIP_CAP})…`);
        let notified = 0;
        for (let k = 0; k < batch; k++) {
            const res = await spawnUser(existing + k, imageGroups, /* sendEmail */ false);
            if (res) {
                notified += res.notified;
                console.log(`+ ${res.name} · ${res.city} · ${res.bucket} · ${res.photos} photo(s) · notified ${res.notified}`);
            }
            if (k < batch - 1) await sleep(randInt(2000, 8000));
        }
        console.log(`[drip] done. match-notifications fired: ${notified}`);
        await prisma.$disconnect();
        return;
    }

    // ----- One-shot burst. --------------------------------------------------
    const count = Math.min(Math.max(parseInt(arg || '30', 10) || 30, 1), 1000);
    const base = await countFemaleSims();
    console.log(`📷 ${imageGroups.length} distinct female image sets available (reused if higher).`);
    console.log(`🎬 Simulating ${count} users joining at irregular intervals…\n`);

    let created = 0, notifiedTotal = 0;
    const tally: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
        const res = await spawnUser(base + i, imageGroups, /* sendEmail */ true);
        if (res) {
            created++;
            notifiedTotal += res.notified;
            tally[res.bucket] = (tally[res.bucket] || 0) + 1;
            console.log(`+ ${res.name} · ${res.city} · ${res.bucket.padEnd(10)} · ${res.photos} photo(s) · notified ${res.notified}`);
        }
        await sleep(randInt(1500, 9000));
    }
    console.log(`\n✅ Done. Created ${created}/${count} users.`);
    console.log(`   Buckets: ${JSON.stringify(tally)}`);
    console.log(`   Total match-notifications fired: ${notifiedTotal}`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Simulator failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
