import { prisma } from '../server';
import { sendPushToUser } from './push.service';
import * as engine from './live-engine.service';

/**
 * Live Dates scheduler — a lightweight in-process ticker.
 *
 * IMPORTANT: this runs inside the API server process (started from server.ts),
 * NOT as a separate cron job. The round engine's timers (setTimeout) live in
 * whichever process calls `startEvent`, so an auto-start MUST happen here, in
 * the same process that also holds the Socket.io connections — otherwise the
 * rounds would fire in a short-lived cron process and no device would get the
 * `live:round_start` events.
 *
 * Each tick does two things, both safe to run repeatedly and safe if more than
 * one server instance is running (every mutation is claimed with a guarded
 * updateMany, so exactly one tick wins):
 *   1. Reminder push — "your event starts soon" to everyone booked, once.
 *   2. Auto-start — for events flagged autoStart, transition to LIVE at startsAt.
 */

const TICK_MS = 30_000; // how often we look for work
const REMINDER_LEAD_MS = 15 * 60_000; // push a reminder up to 15 min before start

let timer: NodeJS.Timeout | null = null;

/** Notify everyone holding a confirmed slot that the event is about to begin. */
async function sendReminder(eventId: string, title: string, startsAt: Date) {
    const bookings = await prisma.liveEventBooking.findMany({
        where: { eventId, status: { in: ['BOOKED', 'ATTENDED'] } },
        select: { userId: true },
    });
    const minutes = Math.max(1, Math.round((startsAt.getTime() - Date.now()) / 60_000));
    const body = `"${title}" starts in about ${minutes} min. Open the app and join the lobby.`;
    for (const b of bookings) {
        await prisma.notification
            .create({
                data: {
                    userId: b.userId,
                    type: 'SYSTEM_ANNOUNCEMENT',
                    title: 'Your Live Date is starting soon ⏰',
                    body,
                    data: { type: 'live_event', eventId },
                },
            })
            .catch(() => {});
        await sendPushToUser(b.userId, {
            title: 'Your Live Date is starting soon ⏰',
            body,
            data: { type: 'live_event', eventId },
        }).catch(() => {});
    }
    console.log(`[live-scheduler] reminder sent to ${bookings.length} booker(s) for "${title}"`);
}

export async function runSchedulerTick() {
    const now = new Date();

    // --- 1. Reminders: upcoming, published, not yet reminded ---
    const soon = new Date(now.getTime() + REMINDER_LEAD_MS);
    const upcoming = await prisma.liveEvent.findMany({
        where: {
            status: { in: ['SCHEDULED', 'BOOKING_OPEN', 'LOBBY'] },
            reminderSentAt: null,
            startsAt: { gt: now, lte: soon },
        },
        select: { id: true, title: true, startsAt: true },
    });
    for (const ev of upcoming) {
        // Claim atomically so only one tick/instance sends the reminder.
        const claim = await prisma.liveEvent.updateMany({
            where: { id: ev.id, reminderSentAt: null },
            data: { reminderSentAt: now },
        });
        if (claim.count !== 1) continue;
        await sendReminder(ev.id, ev.title, ev.startsAt).catch((e) =>
            console.error('[live-scheduler] reminder failed:', e),
        );
    }

    // --- 2. Auto-start: flagged events whose start time has arrived ---
    const dueToStart = await prisma.liveEvent.findMany({
        where: {
            autoStart: true,
            status: { in: ['SCHEDULED', 'BOOKING_OPEN', 'LOBBY'] },
            startsAt: { lte: now },
        },
        select: { id: true, title: true },
    });
    for (const ev of dueToStart) {
        // Only auto-start once at least 2 people are actually in the lobby.
        // Starting an empty event would immediately end it (and it would vanish
        // from the app), so instead we leave it visible and retry on later ticks.
        const inLobby = await prisma.liveEventBooking.count({
            where: { eventId: ev.id, joinedLobbyAt: { not: null }, status: { in: ['BOOKED', 'ATTENDED'] } },
        });
        if (inLobby < 2) continue;
        try {
            const r = await engine.startEvent(ev.id);
            if ((r as any)?.started !== false) console.log(`[live-scheduler] auto-started "${ev.title}"`);
        } catch (e) {
            console.error(`[live-scheduler] auto-start failed for "${ev.title}":`, e);
        }
    }
}

/** Begin the periodic tick. Called once from server bootstrap. */
export function startScheduler() {
    if (timer) return;
    timer = setInterval(() => {
        runSchedulerTick().catch((e) => console.error('[live-scheduler] tick error:', e));
    }, TICK_MS);
    if (typeof timer.unref === 'function') timer.unref(); // don't hold the process open
    console.log(`⏰ Live Dates scheduler started (tick ${TICK_MS / 1000}s)`);
}
