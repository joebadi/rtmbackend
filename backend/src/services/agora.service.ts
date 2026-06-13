import { RtcTokenBuilder, RtcRole } from 'agora-token';

/**
 * Agora RTC token minting for Live Dates calls.
 *
 * The backend is the authority on who may join which channel: it mints a
 * short-lived, channel-scoped token only for authorised participants. Without
 * a valid token a client cannot join an Agora channel.
 *
 * Requires AGORA_APP_ID and AGORA_APP_CERTIFICATE in the environment.
 */

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

export class AgoraNotConfiguredError extends Error {
    code = 'AGORA_NOT_CONFIGURED' as const;
    constructor() {
        super('Video calling is not configured on the server');
        this.name = 'AgoraNotConfiguredError';
    }
}

export const isAgoraConfigured = (): boolean => !!(APP_ID && APP_CERTIFICATE);

/**
 * Map a user id (UUID) to a stable positive 32-bit integer Agora uid.
 * Deterministic so the same user always gets the same uid within a channel.
 */
export const uidFromUserId = (userId: string): number => {
    // FNV-1a 32-bit hash, kept in the positive 31-bit range.
    let hash = 0x811c9dc5;
    for (let i = 0; i < userId.length; i++) {
        hash ^= userId.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 1000000000 || 1; // avoid 0 (Agora "any uid" wildcard)
};

/**
 * Mint an RTC token for a user to join a channel as a publisher.
 */
export const generateRtcToken = (
    channelName: string,
    uid: number,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
) => {
    if (!APP_ID || !APP_CERTIFICATE) {
        throw new AgoraNotConfiguredError();
    }

    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        RtcRole.PUBLISHER,
        ttlSeconds,
        ttlSeconds,
    );

    return {
        appId: APP_ID,
        channelName,
        uid,
        token,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
};
