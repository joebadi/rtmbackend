import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { prisma } from '../server';

export const PAYMENT_GATEWAYS = [
    {
        provider: 'PAYSTACK',
        name: 'Paystack',
        description: 'Cards, bank transfers and USSD for Nigerian customers.',
        secretEnvKey: 'PAYSTACK_SECRET_KEY',
        publicEnvKey: 'PAYSTACK_PUBLIC_KEY',
    },
] as const;

export type PaymentGatewayProvider = (typeof PAYMENT_GATEWAYS)[number]['provider'];

const descriptor = (provider: string) =>
    PAYMENT_GATEWAYS.find((gateway) => gateway.provider === provider);

const encryptionKey = () => {
    const masterSecret =
        process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY || process.env.ADMIN_JWT_SECRET;
    if (!masterSecret) {
        throw new Error('Payment credential encryption is not configured');
    }
    return createHash('sha256').update(masterSecret).digest();
};

const encrypt = (value: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
};

const decrypt = (payload: string) => {
    const [version, iv, tag, encrypted] = payload.split(':');
    if (version !== 'v1' || !iv || !tag || !encrypted) {
        throw new Error('Stored payment credentials are invalid');
    }
    const decipher = createDecipheriv(
        'aes-256-gcm',
        encryptionKey(),
        Buffer.from(iv, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64url')),
        decipher.final(),
    ]).toString('utf8');
};

const keyHint = (value: string) => {
    const prefix = value.split('_').slice(0, 2).join('_');
    return `${prefix}_••••${value.slice(-4)}`;
};

const paystackMode = (value: string) => (value.startsWith('sk_live_') ? 'LIVE' : 'TEST');

const validatePaystackKeys = (publicKey: string, secretKey: string) => {
    const publicMatch = publicKey.match(/^pk_(test|live)_[A-Za-z0-9_-]{8,}$/);
    const secretMatch = secretKey.match(/^sk_(test|live)_[A-Za-z0-9_-]{8,}$/);
    if (!publicMatch || !secretMatch) {
        throw new Error('Enter valid Paystack public and secret keys');
    }
    if (publicMatch[1] !== secretMatch[1]) {
        throw new Error('Paystack public and secret keys must both use the same test or live mode');
    }
};

export const getPaymentGatewayCredentials = async (provider: PaymentGatewayProvider) => {
    const gateway = descriptor(provider);
    if (!gateway) throw new Error('Unsupported payment gateway');

    const setting = await prisma.paymentGatewaySetting.findUnique({ where: { provider } });
    if (setting?.secretKeyEncrypted) {
        return {
            secretKey: decrypt(setting.secretKeyEncrypted),
            publicKey: setting.publicKeyEncrypted ? decrypt(setting.publicKeyEncrypted) : null,
            source: 'DATABASE' as const,
        };
    }

    const secretKey = process.env[gateway.secretEnvKey];
    return secretKey
        ? {
              secretKey,
              publicKey: process.env[gateway.publicEnvKey] || null,
              source: 'ENVIRONMENT' as const,
          }
        : null;
};

export const getPaymentGateways = async () => {
    const stored = await prisma.paymentGatewaySetting.findMany({
        where: { provider: { in: PAYMENT_GATEWAYS.map((gateway) => gateway.provider) } },
    });

    return PAYMENT_GATEWAYS.map((gateway) => {
        const setting = stored.find((item) => item.provider === gateway.provider);
        const hasStoredCredentials = Boolean(setting?.secretKeyEncrypted);
        const environmentSecret = process.env[gateway.secretEnvKey];
        const environmentPublic = process.env[gateway.publicEnvKey];
        const isConfigured = hasStoredCredentials || Boolean(environmentSecret);
        // Preserve the existing Paystack behaviour on first deploy when a key
        // is already present, while never presenting an unconfigured gateway
        // as administratively enabled.
        const isEnabled = setting?.isEnabled ?? isConfigured;

        return {
            provider: gateway.provider,
            name: gateway.name,
            description: gateway.description,
            isConfigured,
            isEnabled,
            isAvailable: isConfigured && isEnabled,
            credentialSource: hasStoredCredentials
                ? 'DATABASE'
                : environmentSecret
                  ? 'ENVIRONMENT'
                  : 'NONE',
            publicKeyHint: setting?.publicKeyHint || (environmentPublic ? keyHint(environmentPublic) : null),
            secretKeyHint: setting?.secretKeyHint || (environmentSecret ? keyHint(environmentSecret) : null),
            keyMode:
                setting?.keyMode || (environmentSecret ? paystackMode(environmentSecret) : null),
            updatedAt: setting?.updatedAt ?? null,
        };
    });
};

export const isPaymentGatewayAvailable = async (provider: PaymentGatewayProvider) => {
    const gateway = (await getPaymentGateways()).find((item) => item.provider === provider);
    return gateway?.isAvailable === true;
};

export const updatePaymentGateway = async (
    adminId: string,
    provider: string,
    isEnabled: boolean
) => {
    const gateway = descriptor(provider);
    if (!gateway) {
        throw new Error('Unsupported payment gateway');
    }
    if (isEnabled && !(await getPaymentGatewayCredentials(gateway.provider))) {
        throw new Error(`${gateway.name} credentials are not configured on the server`);
    }

    await prisma.$transaction([
        prisma.paymentGatewaySetting.upsert({
            where: { provider: gateway.provider },
            create: { provider: gateway.provider, isEnabled, updatedBy: adminId },
            update: { isEnabled, updatedBy: adminId },
        }),
        prisma.auditLog.create({
            data: {
                adminId,
                action: isEnabled ? 'ENABLE_PAYMENT_GATEWAY' : 'DISABLE_PAYMENT_GATEWAY',
                targetType: 'PaymentGateway',
                targetId: gateway.provider,
                details: { provider: gateway.provider, isEnabled },
            },
        }),
    ]);

    return (await getPaymentGateways()).find((item) => item.provider === gateway.provider)!;
};

export const savePaymentGatewayCredentials = async (
    adminId: string,
    provider: string,
    publicKey: string,
    secretKey: string
) => {
    const gateway = descriptor(provider);
    if (!gateway) throw new Error('Unsupported payment gateway');

    const cleanPublicKey = publicKey.trim();
    const cleanSecretKey = secretKey.trim();
    validatePaystackKeys(cleanPublicKey, cleanSecretKey);

    const existing = await prisma.paymentGatewaySetting.findUnique({
        where: { provider: gateway.provider },
        select: { isEnabled: true },
    });
    const mode = paystackMode(cleanSecretKey);

    await prisma.$transaction([
        prisma.paymentGatewaySetting.upsert({
            where: { provider: gateway.provider },
            create: {
                provider: gateway.provider,
                isEnabled: existing?.isEnabled ?? false,
                publicKeyEncrypted: encrypt(cleanPublicKey),
                secretKeyEncrypted: encrypt(cleanSecretKey),
                publicKeyHint: keyHint(cleanPublicKey),
                secretKeyHint: keyHint(cleanSecretKey),
                keyMode: mode,
                updatedBy: adminId,
            },
            update: {
                publicKeyEncrypted: encrypt(cleanPublicKey),
                secretKeyEncrypted: encrypt(cleanSecretKey),
                publicKeyHint: keyHint(cleanPublicKey),
                secretKeyHint: keyHint(cleanSecretKey),
                keyMode: mode,
                updatedBy: adminId,
            },
        }),
        prisma.auditLog.create({
            data: {
                adminId,
                action: 'UPDATE_PAYMENT_GATEWAY_CREDENTIALS',
                targetType: 'PaymentGateway',
                targetId: gateway.provider,
                details: { provider: gateway.provider, mode },
            },
        }),
    ]);

    return (await getPaymentGateways()).find((item) => item.provider === gateway.provider)!;
};
