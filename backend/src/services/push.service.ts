import { prisma } from '../server';
import { getMessaging } from '../config/firebase';

export type PushPayload = {
    title: string;
    body: string;
    /** FCM data values must be strings. */
    data?: Record<string, string>;
};

/**
 * Send an FCM push to a single user's registered device. No-op if push is
 * disabled (Firebase not configured) or the user has no device token. Clears a
 * stale token automatically so we stop trying to reach a dead install.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    const messaging = getMessaging();
    if (!messaging) return;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { deviceToken: true },
    });
    const token = user?.deviceToken;
    if (!token) return;

    try {
        await messaging.send({
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
            android: {
                priority: 'high',
                notification: { channelId: 'rtm_default', sound: 'default' },
            },
            apns: {
                payload: { aps: { sound: 'default' } },
            },
        });
    } catch (err: any) {
        const code = err?.errorInfo?.code || err?.code;
        if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
        ) {
            // Token is dead — drop it so future sends short-circuit.
            await prisma.user
                .update({ where: { id: userId }, data: { deviceToken: null } })
                .catch(() => {});
        } else {
            console.error('[Push] send failed:', err?.message || err);
        }
    }
}
