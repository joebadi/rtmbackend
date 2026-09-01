import { prisma } from '../server';
import { calculateCompatibility } from './match.service';
import { sendPushToUser } from './push.service';
import { sendMatchEmail } from '../utils/email.util';

/**
 * Proactive "new match near you" notifications.
 *
 * When a new user's profile becomes matchable, we find existing users for whom
 * the newcomer is a strong match (compatibility >= threshold, no deal-breakers)
 * and notify them via a coalesced in-app notification + push, plus a throttled
 * digest email. This is what surfaces "4 new 100% matches joined your area".
 */

const DEFAULT_THRESHOLD = 70;
const COALESCE_WINDOW_MS = 12 * 60 * 60 * 1000; // fold new matches into one notice for 12h
const EMAIL_THROTTLE_MS = 90 * 1000; // at most one match email per recipient / 90s

// Per-recipient email throttle (process-local; fine for the drip simulator too).
const lastEmailAt = new Map<string, number>();

/** Emails we never actually deliver to (simulated accounts). */
function isDeliverableEmail(email: string): boolean {
    const e = email.toLowerCase();
    return !(
        e.endsWith('@example.com') ||
        e.endsWith('@example.org') ||
        e.endsWith('.test') ||
        e.endsWith('.invalid') ||
        e.endsWith('@sim.local')
    );
}

const opposite = (g: 'MALE' | 'FEMALE') => (g === 'MALE' ? 'FEMALE' : 'MALE');

/**
 * Notify existing users that [newUserId] is a strong new match for them.
 * Returns the number of recipients notified.
 */
export async function notifyExistingUsersOfNewProfile(
    newUserId: string,
    opts: { threshold?: number; email?: boolean } = {}
): Promise<number> {
    const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
    const sendEmail = opts.email ?? true;

    const newProfile = await prisma.profile.findUnique({
        where: { userId: newUserId },
        select: {
            firstName: true, age: true, city: true, gender: true, isActive: true,
            user: { select: { isTest: true } },
        },
    });
    if (!newProfile || !newProfile.isActive) return 0;
    const newIsTest = newProfile.user?.isTest === true;

    // Candidate recipients: opposite gender, have preferences, active, and can
    // actually receive (a device token or a deliverable email) — this naturally
    // skips simulated accounts that have neither. A TEST newcomer only ever
    // notifies other TEST users, so simulated joins never reach real users.
    const recipients = await prisma.user.findMany({
        where: {
            id: { not: newUserId },
            ...(newIsTest ? { isTest: true } : {}),
            matchPreferences: { isNot: null },
            profile: { gender: opposite(newProfile.gender), isActive: true, isBanned: false },
        },
        select: { id: true, email: true, deviceToken: true, profile: { select: { firstName: true } } },
    }).then((rows) =>
        rows.filter((r) => r.deviceToken != null || isDeliverableEmail(r.email))
    );

    let notified = 0;

    for (const r of recipients) {
        const { score, dealBreakers } = await calculateCompatibility(r.id, newUserId);
        if (dealBreakers.length > 0 || score < threshold) continue;

        await coalesceAndNotify(r, newUserId, newProfile, score, sendEmail);
        notified++;
    }
    return notified;
}

async function coalesceAndNotify(
    recipient: { id: string; email: string; profile: { firstName: string } | null },
    newUserId: string,
    newProfile: { firstName: string; age: number; city: string | null; gender: string },
    score: number,
    sendEmail: boolean
): Promise<void> {
    const since = new Date(Date.now() - COALESCE_WINDOW_MS);

    const existing = await prisma.notification.findFirst({
        where: { userId: recipient.id, type: 'NEW_MATCH', isRead: false, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
    });

    // Track the set of matched users so the count/list stay accurate.
    const prevData = (existing?.data as any) || {};
    const ids: string[] = Array.isArray(prevData.matchUserIds) ? [...prevData.matchUserIds] : [];
    if (!ids.includes(newUserId)) ids.push(newUserId);
    const count = ids.length;

    const title = count === 1 ? 'New match 💕' : `${count} new matches near you 💕`;
    const body =
        count === 1
            ? `${newProfile.firstName}${newProfile.age ? `, ${newProfile.age}` : ''} is a ${score}% match near you`
            : `${newProfile.firstName} and ${count - 1} more are new matches in your area`;

    const data = { type: 'NEW_MATCH', screen: '/matches', matchUserIds: ids, latestUserId: newUserId, score };

    if (existing) {
        await prisma.notification.update({
            where: { id: existing.id },
            data: { title, body, data, createdAt: new Date() },
        });
    } else {
        await prisma.notification.create({
            data: { userId: recipient.id, type: 'NEW_MATCH', title, body, data },
        });
    }

    // Realtime + push.
    try {
        const { getIO } = await import('./socket.service');
        getIO().to(recipient.id).emit('notification', { type: 'NEW_MATCH', title, body, data });
    } catch {}

    await sendPushToUser(recipient.id, {
        title,
        body,
        // `type: match` routes the tap to the Matches page in the mobile app.
        data: { type: 'match', screen: 'matches', count: String(count) },
    });

    // Throttled digest email (skips simulated / non-deliverable addresses).
    if (sendEmail && isDeliverableEmail(recipient.email)) {
        const last = lastEmailAt.get(recipient.id) ?? 0;
        if (Date.now() - last > EMAIL_THROTTLE_MS) {
            lastEmailAt.set(recipient.id, Date.now());
            await sendMatchEmail(
                recipient.email,
                recipient.profile?.firstName || 'there',
                [{ name: newProfile.firstName, age: newProfile.age, city: newProfile.city || undefined, score }],
                count
            );
        }
    }
}
