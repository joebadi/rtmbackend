import { prisma } from '../server';
import { creditDiamonds, getBalance } from './diamond.service';
import { DIAMOND_PACKAGES, getPackageById } from '../config/diamonds.config';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

/**
 * Error thrown when payments aren't configured (no Paystack key).
 */
export class PaymentNotConfiguredError extends Error {
    code = 'PAYMENT_NOT_CONFIGURED' as const;
    constructor() {
        super('Payments are not configured on the server');
        this.name = 'PaymentNotConfiguredError';
    }
}

/**
 * Wallet summary: current diamond balance + the catalogue of purchasable packages.
 */
export const getWallet = async (userId: string) => {
    const balance = await getBalance(userId);
    return {
        balance,
        packages: DIAMOND_PACKAGES,
    };
};

/**
 * List a user's transactions (purchases), most recent first.
 */
export const listTransactions = async (userId: string, limit = 20, offset = 0) => {
    return prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
};

/**
 * Start a diamond purchase via Paystack.
 *
 * Creates a PENDING transaction and asks Paystack for an authorization URL the
 * client opens to pay. The diamonds are only granted once the payment is
 * verified (see verifyDiamondPurchase), so the client cannot grant itself
 * diamonds by tampering with the request.
 */
export const initializeDiamondPurchase = async (userId: string, packageId: string) => {
    if (!PAYSTACK_SECRET) {
        throw new PaymentNotConfiguredError();
    }

    const pkg = getPackageById(packageId);
    if (!pkg) {
        throw new Error('Invalid diamond package');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });
    if (!user?.email) {
        throw new Error('User email not found');
    }

    const reference = `rtm_${userId.slice(0, 8)}_${Date.now()}`;
    const totalDiamonds = pkg.diamonds + pkg.bonus;

    // Create the pending transaction up front so we have a record even if the
    // user abandons checkout.
    await prisma.transaction.create({
        data: {
            userId,
            type: 'DIAMONDS',
            amount: pkg.price,
            currency: pkg.currency,
            paymentMethod: 'PAYSTACK',
            paymentProvider: 'paystack',
            transactionId: reference, // replaced with Paystack's id on verify
            reference,
            status: 'PENDING',
            metadata: {
                packageId: pkg.id,
                diamonds: totalDiamonds,
                baseDiamonds: pkg.diamonds,
                bonus: pkg.bonus,
            },
        },
    });

    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: user.email,
            amount: pkg.price * 100, // Paystack expects the amount in kobo
            reference,
            metadata: { userId, packageId: pkg.id, diamonds: totalDiamonds },
        }),
    });

    const json: any = await response.json();
    if (!response.ok || !json.status) {
        throw new Error(json?.message || 'Failed to initialize payment');
    }

    return {
        reference,
        authorizationUrl: json.data.authorization_url,
        accessCode: json.data.access_code,
        package: pkg,
    };
};

/**
 * Verify a Paystack payment and grant diamonds. Idempotent — re-verifying an
 * already-completed transaction will not double-credit.
 */
export const verifyDiamondPurchase = async (userId: string, reference: string) => {
    if (!PAYSTACK_SECRET) {
        throw new PaymentNotConfiguredError();
    }

    const transaction = await prisma.transaction.findUnique({
        where: { reference },
    });

    if (!transaction || transaction.userId !== userId) {
        throw new Error('Transaction not found');
    }

    // Already processed — return current state without re-crediting.
    if (transaction.status === 'COMPLETED') {
        const balance = await getBalance(userId);
        const meta = (transaction.metadata as any) || {};
        return { status: 'COMPLETED', diamonds: meta.diamonds ?? 0, balance, alreadyProcessed: true };
    }

    const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const json: any = await response.json();

    const paid = json?.status && json?.data?.status === 'success';
    if (!paid) {
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'FAILED' },
        });
        throw new Error('Payment was not successful');
    }

    const meta = (transaction.metadata as any) || {};
    const diamonds: number = meta.diamonds ?? 0;

    // Credit diamonds and mark the transaction complete.
    const balance = await creditDiamonds(userId, diamonds);
    await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            transactionId: String(json.data.id ?? reference),
        },
    });

    return { status: 'COMPLETED', diamonds, balance, alreadyProcessed: false };
};
