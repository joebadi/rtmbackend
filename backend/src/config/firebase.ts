import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Firebase Admin initialization for FCM push notifications.
 *
 * Credentials come from EITHER:
 *   - FIREBASE_SERVICE_ACCOUNT_PATH — path to the downloaded service-account JSON
 *     (preferred; keep the file outside git), or
 *   - FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars.
 *
 * If neither is present the module stays disabled and push sends become no-ops,
 * so the server runs fine before Firebase is configured.
 */
let messaging: admin.messaging.Messaging | null = null;
let initialized = false;

function loadCredential(): admin.credential.Credential | null {
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (saPath) {
        try {
            const abs = path.isAbsolute(saPath) ? saPath : path.resolve(process.cwd(), saPath);
            const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
            return admin.credential.cert(json);
        } catch (err) {
            console.error('[Push] Failed to read FIREBASE_SERVICE_ACCOUNT_PATH:', err);
            return null;
        }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (projectId && clientEmail && privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n'); // restore PEM newlines
        return admin.credential.cert({ projectId, clientEmail, privateKey });
    }
    return null;
}

export function initFirebase(): admin.messaging.Messaging | null {
    if (initialized) return messaging;
    initialized = true;

    const credential = loadCredential();
    if (!credential) {
        console.warn('[Push] Firebase not configured — push notifications disabled.');
        return null;
    }

    try {
        const app = admin.apps.length
            ? admin.app()
            : admin.initializeApp({ credential });
        messaging = app.messaging();
        console.log('[Push] Firebase Admin initialized.');
    } catch (err) {
        console.error('[Push] Firebase init failed:', err);
        messaging = null;
    }
    return messaging;
}

export function getMessaging(): admin.messaging.Messaging | null {
    return initialized ? messaging : initFirebase();
}
