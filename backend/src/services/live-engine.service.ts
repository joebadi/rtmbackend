import { prisma } from '../server';
import { getIO } from './socket.service';
import { generateRtcToken, uidFromUserId } from './agora.service';

/**
 * Live Dates realtime engine — the round-robin "matchmaker".
 *
 * Drives an event through LOBBY → LIVE (a sequence of timed 1:1 rounds) →
 * POST_EVENT. Each round pairs opposite-gender attendees who haven't met yet,
 * gives each pair an Agora channel, and pushes round transitions over sockets.
 *
 * State machine is in-memory (timers) but every transition is persisted to the
 * DB (event.status, LivePairing rows) so structure survives a restart; an admin
 * can resume by re-triggering the next round.
 */

interface Runtime {
    roundNumber: number;
    timer: NodeJS.Timeout | null;
    roundEndsAt: number | null; // epoch ms
}

const runtimes = new Map<string, Runtime>();

const ROUND_BUFFER_MS = 5000; // brief gap between rounds

const emit = (userId: string, event: string, payload: any) => {
    try {
        getIO().to(userId).emit(event, payload);
    } catch (e) {
        console.warn('[live-engine] socket emit failed:', e);
    }
};

/** Public profile card for a partner (photo hidden for blind dates). */
const partnerCard = async (userId: string, blind: boolean) => {
    const profile = await prisma.profile.findUnique({
        where: { userId },
        select: {
            firstName: true,
            age: true,
            city: true,
            photos: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
    });
    return {
        userId,
        firstName: profile?.firstName ?? 'Your date',
        age: profile?.age ?? null,
        city: profile?.city ?? null,
        photoUrl: blind ? null : profile?.photos?.[0]?.url ?? null,
    };
};

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

// ============================================
// LIFECYCLE
// ============================================

/** Begin the event: mark attendees, set LIVE, run round 1. */
export const startEvent = async (eventId: string) => {
    const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');
    if (runtimes.has(eventId)) throw new Error('Event is already running');

    // Everyone still holding a confirmed slot becomes an attendee.
    await prisma.liveEventBooking.updateMany({
        where: { eventId, status: 'BOOKED' },
        data: { status: 'ATTENDED' },
    });

    await prisma.liveEvent.update({ where: { id: eventId }, data: { status: 'LIVE' } });
    runtimes.set(eventId, { roundNumber: 0, timer: null, roundEndsAt: null });

    await runNextRound(eventId);
    return { status: 'LIVE' };
};

/** Pair people for the next round, or end the event when no pairings remain. */
export const runNextRound = async (eventId: string) => {
    const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    if (!event) return;

    const rt = runtimes.get(eventId) ?? { roundNumber: 0, timer: null, roundEndsAt: null };
    if (rt.timer) clearTimeout(rt.timer);

    const round = rt.roundNumber + 1;
    if (round > event.maxRounds) {
        return endEvent(eventId);
    }

    const blind = event.type === 'BLIND_DATE';

    // Attendees + their gender.
    const attendees = await prisma.liveEventBooking.findMany({
        where: { eventId, status: 'ATTENDED' },
        select: { userId: true },
    });
    const userIds = attendees.map((a) => a.userId);
    if (userIds.length < 2) {
        return endEvent(eventId);
    }

    const profiles = await prisma.profile.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, gender: true },
    });
    const genderOf = new Map(profiles.map((p) => [p.userId, p.gender]));

    // Who has already met whom, and rounds played (for fair ordering).
    const past = await prisma.livePairing.findMany({
        where: { eventId },
        select: { userAId: true, userBId: true },
    });
    const met = new Set(past.map((p) => pairKey(p.userAId, p.userBId)));
    const played = new Map<string, number>();
    for (const p of past) {
        played.set(p.userAId, (played.get(p.userAId) ?? 0) + 1);
        played.set(p.userBId, (played.get(p.userBId) ?? 0) + 1);
    }

    const byPlayed = (a: string, b: string) => (played.get(a) ?? 0) - (played.get(b) ?? 0);
    const males = userIds.filter((u) => genderOf.get(u) === 'MALE').sort(byPlayed);
    const females = userIds.filter((u) => genderOf.get(u) === 'FEMALE').sort(byPlayed);

    // Greedy opposite-gender matchmaking, skipping pairs that have already met.
    const usedFemales = new Set<string>();
    const newPairs: { a: string; b: string }[] = [];
    for (const m of males) {
        const match = females.find((f) => !usedFemales.has(f) && !met.has(pairKey(m, f)));
        if (match) {
            usedFemales.add(match);
            newPairs.push({ a: m, b: match });
        }
    }

    if (newPairs.length === 0) {
        // No fresh pairings possible — the event is done.
        return endEvent(eventId);
    }

    // Persist pairings + notify participants.
    const paired = new Set<string>();
    for (let i = 0; i < newPairs.length; i++) {
        const { a, b } = newPairs[i];
        const channelName = `live_${eventId}_r${round}_${i}`;
        const pairing = await prisma.livePairing.create({
            data: { eventId, roundNumber: round, userAId: a, userBId: b, channelName, startedAt: new Date() },
        });
        paired.add(a);
        paired.add(b);

        const [cardForA, cardForB] = await Promise.all([
            partnerCard(b, blind),
            partnerCard(a, blind),
        ]);

        const base = {
            eventId,
            roundNumber: round,
            pairingId: pairing.id,
            channelName,
            roundSeconds: event.roundSeconds,
            endsAt: new Date(Date.now() + event.roundSeconds * 1000).toISOString(),
            audioOnly: blind,
        };
        emit(a, 'live:round_start', { ...base, partner: cardForA });
        emit(b, 'live:round_start', { ...base, partner: cardForB });
    }

    // Anyone not paired sits this round out.
    for (const u of userIds) {
        if (!paired.has(u)) {
            emit(u, 'live:sit_out', { eventId, roundNumber: round });
        }
    }

    const roundEndsAt = Date.now() + event.roundSeconds * 1000;
    const timer = setTimeout(() => {
        endRound(eventId).then(() => {
            setTimeout(() => runNextRound(eventId), ROUND_BUFFER_MS);
        });
    }, event.roundSeconds * 1000);

    runtimes.set(eventId, { roundNumber: round, timer, roundEndsAt });
    return { round, pairs: newPairs.length };
};

/** Close out the current round's pairings. */
export const endRound = async (eventId: string) => {
    const rt = runtimes.get(eventId);
    const round = rt?.roundNumber;
    if (!round) return;

    await prisma.livePairing.updateMany({
        where: { eventId, roundNumber: round, endedAt: null },
        data: { endedAt: new Date() },
    });

    const pairings = await prisma.livePairing.findMany({
        where: { eventId, roundNumber: round },
        select: { userAId: true, userBId: true, id: true },
    });
    for (const p of pairings) {
        emit(p.userAId, 'live:round_end', { eventId, roundNumber: round, pairingId: p.id });
        emit(p.userBId, 'live:round_end', { eventId, roundNumber: round, pairingId: p.id });
    }
};

/** Finish the event. */
export const endEvent = async (eventId: string) => {
    const rt = runtimes.get(eventId);
    if (rt?.timer) clearTimeout(rt.timer);
    runtimes.delete(eventId);

    await prisma.livePairing.updateMany({
        where: { eventId, endedAt: null },
        data: { endedAt: new Date() },
    });
    await prisma.liveEvent.update({ where: { id: eventId }, data: { status: 'POST_EVENT' } });

    const attendees = await prisma.liveEventBooking.findMany({
        where: { eventId, status: 'ATTENDED' },
        select: { userId: true },
    });
    const matches = await prisma.livePairing.count({ where: { eventId, isMatch: true } });
    for (const a of attendees) {
        emit(a.userId, 'live:event_ended', { eventId, matches });
    }
    return { status: 'POST_EVENT', matches };
};

// ============================================
// PARTICIPANT ACTIONS
// ============================================

export const joinLobby = async (userId: string, eventId: string) => {
    const booking = await prisma.liveEventBooking.findUnique({
        where: { eventId_userId: { eventId, userId } },
    });
    if (!booking || !['BOOKED', 'ATTENDED'].includes(booking.status)) {
        throw new Error('You have not booked this event');
    }
    await prisma.liveEventBooking.update({
        where: { id: booking.id },
        data: { joinedLobbyAt: new Date() },
    });
    return { joined: true };
};

/** What the user should be looking at right now. */
export const getEventState = async (userId: string, eventId: string) => {
    const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');

    const rt = runtimes.get(eventId);
    const round = rt?.roundNumber ?? 0;

    let myPairing: any = null;
    if (event.status === 'LIVE' && round > 0) {
        const pairing = await prisma.livePairing.findFirst({
            where: {
                eventId,
                roundNumber: round,
                endedAt: null,
                OR: [{ userAId: userId }, { userBId: userId }],
            },
        });
        if (pairing) {
            const partnerId = pairing.userAId === userId ? pairing.userBId : pairing.userAId;
            myPairing = {
                pairingId: pairing.id,
                channelName: pairing.channelName,
                audioOnly: event.type === 'BLIND_DATE',
                partner: await partnerCard(partnerId, event.type === 'BLIND_DATE'),
                endsAt: rt?.roundEndsAt ? new Date(rt.roundEndsAt).toISOString() : null,
            };
        }
    }

    return {
        eventId,
        status: event.status,
        roundNumber: round,
        maxRounds: event.maxRounds,
        myPairing, // null = sitting out / between rounds
    };
};

/** Mint an Agora token bound to the user's active pairing channel. */
export const getPairingToken = async (userId: string, pairingId: string) => {
    const pairing = await prisma.livePairing.findUnique({ where: { id: pairingId } });
    if (!pairing) throw new Error('Pairing not found');
    if (pairing.userAId !== userId && pairing.userBId !== userId) {
        throw new Error('You are not part of this call');
    }
    if (pairing.endedAt) throw new Error('This round has ended');

    return generateRtcToken(pairing.channelName, uidFromUserId(userId), 3600);
};

/**
 * Record private interest. When both sides are interested it becomes a match:
 * a mutual like + conversation unlock, and both get a `live:matched` push.
 * A non-mutual "interested" or a skip is never revealed to the other person.
 */
export const recordInterest = async (userId: string, pairingId: string, interested: boolean) => {
    const pairing = await prisma.livePairing.findUnique({ where: { id: pairingId } });
    if (!pairing) throw new Error('Pairing not found');

    const isA = pairing.userAId === userId;
    const isB = pairing.userBId === userId;
    if (!isA && !isB) throw new Error('You are not part of this pairing');

    const updated = await prisma.livePairing.update({
        where: { id: pairingId },
        data: isA ? { aInterested: interested } : { bInterested: interested },
    });

    const mutual = updated.aInterested === true && updated.bInterested === true;
    if (mutual && !pairing.isMatch) {
        await prisma.livePairing.update({ where: { id: pairingId }, data: { isMatch: true } });
        await createMatch(pairing.userAId, pairing.userBId);
    }

    return { interested, matched: mutual };
};

export const ratePairing = async (userId: string, pairingId: string, rating: number) => {
    const pairing = await prisma.livePairing.findUnique({ where: { id: pairingId } });
    if (!pairing) throw new Error('Pairing not found');
    const isA = pairing.userAId === userId;
    if (!isA && pairing.userBId !== userId) throw new Error('You are not part of this pairing');

    await prisma.livePairing.update({
        where: { id: pairingId },
        data: isA ? { aRating: rating } : { bRating: rating },
    });
    return { rated: true };
};

/** Create a mutual match (likes both ways) + notify both users. */
const createMatch = async (userA: string, userB: string) => {
    await prisma.like.upsert({
        where: { likerId_likedUserId: { likerId: userA, likedUserId: userB } },
        create: { likerId: userA, likedUserId: userB, isMutual: true },
        update: { isMutual: true },
    });
    await prisma.like.upsert({
        where: { likerId_likedUserId: { likerId: userB, likedUserId: userA } },
        create: { likerId: userB, likedUserId: userA, isMutual: true },
        update: { isMutual: true },
    });

    for (const [self, other] of [[userA, userB], [userB, userA]] as const) {
        const card = await partnerCard(other, false);
        await prisma.notification.create({
            data: {
                userId: self,
                type: 'MUTUAL_MATCH',
                title: "It's a match! 💖",
                body: `You and ${card.firstName} both said yes on Live Dates.`,
                data: { matchedUserId: other },
            },
        });
        emit(self, 'live:matched', { partner: card });
    }
};
