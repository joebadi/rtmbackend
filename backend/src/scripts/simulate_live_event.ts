/**
 * Live Dates event simulator / verifier (TEST DATA, own backend).
 *
 * Runs a complete Live Dates event using the existing isTest accounts and
 * checks the engine's behaviour end-to-end — booking + diamond charges, lobby,
 * round-robin pairing, interest → mutual match, blind-date unveil budgets and
 * post-event results. Media (Agora) is NOT exercised here; rounds run on the
 * server-side timers regardless of whether anyone joins the call.
 *
 * Run (from backend/, after building):
 *   node dist/scripts/simulate_live_event.js verify                # speed dating, headless
 *   node dist/scripts/simulate_live_event.js verify BLIND_DATE     # blind date incl. unveils
 *   node dist/scripts/simulate_live_event.js phone [BLIND_DATE]    # prep a real event you
 *       # start from the admin dashboard while riding along on the target's phone;
 *       # the script keeps answering "interested" for the simulated side.
 *   node dist/scripts/simulate_live_event.js --clean               # delete TEST events
 */
import 'dotenv/config';
import { prisma } from '../server';
import * as live from '../services/live.service';
import * as engine from '../services/live-engine.service';
import { creditDiamonds, getBalance } from '../services/diamond.service';

const TARGET_EMAIL = 'thistyscholar@yahoo.com';
const TEST_TITLE_PREFIX = 'TEST — ';
const FEMALES_TO_BOOK = 6;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pairKey = (a: string, b: string) => [a, b].sort().join('|');

let failures = 0;
const check = (ok: boolean, label: string, detail = '') => {
    console.log(`${ok ? '  ✅' : '  ❌'} ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures++;
};

async function getParticipants() {
    const target = await prisma.user.findFirst({
        where: { email: { equals: TARGET_EMAIL, mode: 'insensitive' } },
        include: { profile: true },
    });
    if (!target?.profile) {
        throw new Error(`Target ${TARGET_EMAIL} not found — run simulate_users.js first`);
    }
    const females = await prisma.user.findMany({
        where: { isTest: true, profile: { gender: 'FEMALE', isActive: true } },
        take: FEMALES_TO_BOOK,
        include: { profile: { select: { firstName: true } } },
    });
    if (females.length < 2) {
        throw new Error('Not enough female test users — run simulate_users.js first');
    }
    return { target, females };
}

async function createTestEvent(type: 'SPEED_DATING' | 'BLIND_DATE', opts: { roundSeconds: number; startsInMs: number }) {
    return prisma.liveEvent.create({
        data: {
            title: `${TEST_TITLE_PREFIX}${type === 'BLIND_DATE' ? 'Blind Date' : 'Speed Dating'} (simulated)`,
            description: 'Automated test event — safe to delete.',
            type,
            status: 'SCHEDULED', // bookable
            startsAt: new Date(Date.now() + opts.startsInMs),
            bookingOpensAt: new Date(),
            capacity: 12,
            diamondCost: 10,
            roundSeconds: opts.roundSeconds,
            maxRounds: 4,
            minProfileCompleteness: 0,
            requireVerified: false,
            // Small free budget so a paid unveil is exercised with few pairings.
            freeUnveils: 1,
            unveilCost: 5,
            createdByAdmin: 'simulator',
        },
    });
}

/** Credit + book + lobby-join every participant through the real service layer. */
async function bookEveryone(eventId: string, userIds: string[]) {
    for (const uid of userIds) {
        await creditDiamonds(uid, 100);
        await live.bookEvent(uid, eventId);
        await engine.joinLobby(uid, eventId);
    }
}

/**
 * Keep answering interest on new pairings until the event leaves LIVE.
 * Sim (female) side always says yes; the target's answer comes from
 * [targetAnswer] (null = leave for the phone user to answer).
 */
async function autoAnswerInterest(
    eventId: string,
    targetId: string,
    targetAnswer: ((round: number) => boolean) | null,
    isDone: () => Promise<boolean>,
) {
    const answered = new Set<string>();
    while (true) {
        const pairings = await prisma.livePairing.findMany({ where: { eventId } });
        for (const p of pairings) {
            if (answered.has(p.id)) continue;
            answered.add(p.id);
            const simSide = p.userAId === targetId ? p.userBId : p.userAId;
            await engine.recordInterest(simSide, p.id, true);
            if (targetAnswer) {
                await engine.recordInterest(targetId, p.id, targetAnswer(p.roundNumber));
            }
        }
        if (await isDone()) return;
        await sleep(2500);
    }
}

async function verifyMode(type: 'SPEED_DATING' | 'BLIND_DATE') {
    console.log(`\n🎬 VERIFY — headless ${type} event (fast rounds, no media)\n`);
    const { target, females } = await getParticipants();
    const targetId = target.id;
    const event = await createTestEvent(type, { roundSeconds: 12, startsInMs: 60_000 });

    // --- booking + diamonds ---
    const balancesBefore = new Map<string, number>();
    for (const u of [targetId, ...females.map((f) => f.id)]) {
        await creditDiamonds(u, 100);
        balancesBefore.set(u, await getBalance(u));
    }
    for (const u of [targetId, ...females.map((f) => f.id)]) {
        await live.bookEvent(u, event.id);
        await engine.joinLobby(u, event.id);
    }
    for (const u of [targetId, ...females.map((f) => f.id)]) {
        const now = await getBalance(u);
        check(now === (balancesBefore.get(u) ?? 0) - event.diamondCost,
            `booking charged ${event.diamondCost}💎`, `user ${u.slice(0, 8)} ${balancesBefore.get(u)}→${now}`);
        balancesBefore.set(u, now);
    }

    // --- run the event in-process (socket emits no-op harmlessly here) ---
    console.log(`\n▶ starting event: ${event.maxRounds} rounds × ${event.roundSeconds}s…`);
    await engine.startEvent(event.id);

    const done = async () => {
        const e = await prisma.liveEvent.findUnique({ where: { id: event.id }, select: { status: true } });
        return e?.status === 'POST_EVENT' || e?.status === 'COMPLETED';
    };
    // Target alternates yes/no so both the match and no-match paths are hit.
    const answerTask = autoAnswerInterest(event.id, targetId, (round) => round % 2 === 1, done);

    const deadline = Date.now() + 3 * 60_000;
    while (!(await done())) {
        if (Date.now() > deadline) throw new Error('Timed out waiting for POST_EVENT');
        await sleep(3000);
    }
    await answerTask;
    console.log('▶ event reached POST_EVENT\n');

    // --- assertions ---
    const pairings = await prisma.livePairing.findMany({ where: { eventId: event.id } });
    const expectedPairs = Math.min(event.maxRounds, females.length);
    check(pairings.length === expectedPairs, `pairings created`, `${pairings.length}/${expectedPairs}`);
    const keys = pairings.map((p) => pairKey(p.userAId, p.userBId));
    check(new Set(keys).size === keys.length, 'no repeated pairs');
    check(pairings.every((p) => p.userAId === targetId || p.userBId === targetId),
        'every pairing includes the only male (round-robin over females)');
    check(pairings.every((p) => p.endedAt !== null), 'all pairings closed');

    const shouldMatch = pairings.filter((p) => p.roundNumber % 2 === 1);
    const matched = pairings.filter((p) => p.isMatch);
    check(matched.length === shouldMatch.length,
        'mutual interest → match (and non-mutual stays unmatched)',
        `${matched.length}/${shouldMatch.length} matched`);

    for (const m of matched) {
        const partner = m.userAId === targetId ? m.userBId : m.userAId;
        const [likeAB, likeBA, notif] = await Promise.all([
            prisma.like.findUnique({ where: { likerId_likedUserId: { likerId: targetId, likedUserId: partner } } }),
            prisma.like.findUnique({ where: { likerId_likedUserId: { likerId: partner, likedUserId: targetId } } }),
            prisma.notification.findFirst({ where: { userId: targetId, type: 'MUTUAL_MATCH', data: { path: ['matchedUserId'], equals: partner } } }),
        ]);
        check(likeAB?.isMutual === true && likeBA?.isMutual === true,
            `match wrote mutual likes (partner ${partner.slice(0, 8)})`);
        check(!!notif, `match notification created (partner ${partner.slice(0, 8)})`);
    }

    // --- blind date: unveil budget + charging ---
    if (type === 'BLIND_DATE') {
        console.log('\n▶ blind-date unveils (free budget = 1, then 5💎 each)…');
        const nonMatched = pairings.filter((p) => !p.isMatch);
        let expectFree = event.freeUnveils;
        for (const p of nonMatched) {
            const before = await getBalance(targetId);
            const res = await engine.unveilPartner(targetId, p.id);
            const after = await getBalance(targetId);
            if (expectFree > 0) {
                check(res.charged === 0 && after === before, `unveil #${event.freeUnveils - expectFree + 1} free`);
                expectFree--;
            } else {
                check(res.charged === event.unveilCost && after === before - event.unveilCost,
                    `paid unveil charged ${event.unveilCost}💎`, `${before}→${after}`);
            }
            check(res.partner.photoUrl !== undefined, 'unveil returns partner card');
        }
        if (matched[0]) {
            const res = await engine.unveilPartner(targetId, matched[0].id);
            check(res.charged === 0, 'matched partner reveals free');
        }
    }

    const results = await engine.getEventResults(targetId, event.id);
    check(results.matches === matched.length, 'results screen match count agrees');
    check(results.pairings.length === pairings.length, 'results lists every date');

    console.log(`\n${failures === 0 ? '🏁 ALL CHECKS PASSED' : `🔴 ${failures} CHECK(S) FAILED`} — event "${event.title}" left in POST_EVENT for inspection (use --clean to remove).`);
}

async function phoneMode(type: 'SPEED_DATING' | 'BLIND_DATE') {
    console.log(`\n📱 PHONE-IN-THE-LOOP — real ${type} event on the live server\n`);
    const { target, females } = await getParticipants();
    // Comfortable rounds for a human; starts "soon" so it appears in the app.
    const event = await createTestEvent(type, { roundSeconds: 60, startsInMs: 5 * 60_000 });
    await bookEveryone(event.id, [target.id, ...females.map((f) => f.id)]);

    console.log(`Event ready: "${event.title}"  (id ${event.id})`);
    console.log(`Booked: ${TARGET_EMAIL} + ${females.length} simulated users\n`);
    console.log('Now:');
    console.log('  1. On the phone, log in as the target — the event is on the Live Dates page.');
    console.log('  2. In the admin dashboard → Live, press START on this event.');
    console.log('  3. Ride along on the phone; this script keeps answering "interested"');
    console.log('     for the simulated side, so tapping Interested creates real matches.\n');
    console.log('⏳ watching for pairings (Ctrl+C when done)…');

    const done = async () => {
        const e = await prisma.liveEvent.findUnique({ where: { id: event.id }, select: { status: true } });
        return e?.status === 'POST_EVENT' || e?.status === 'COMPLETED';
    };
    await autoAnswerInterest(event.id, target.id, null, done);
    console.log('🏁 event finished — check the results screen on the phone.');
}

async function clean() {
    const res = await prisma.liveEvent.deleteMany({
        where: { title: { startsWith: TEST_TITLE_PREFIX } },
    });
    console.log(`🧹 Deleted ${res.count} test event(s) (bookings/pairings cascade).`);
}

async function main() {
    const [, , mode, typeArg] = process.argv;
    const type = typeArg === 'BLIND_DATE' ? 'BLIND_DATE' : 'SPEED_DATING';
    if (mode === '--clean') await clean();
    else if (mode === 'phone') await phoneMode(type);
    else await verifyMode(type);
    await prisma.$disconnect();
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
    console.error('Simulator failed:', e);
    await prisma.$disconnect();
    process.exit(1);
});
