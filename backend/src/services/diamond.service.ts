import { prisma } from '../server';

/**
 * Thrown when a user does not have enough diamonds for an action.
 * Carries the required amount and the user's current balance so the API/UI
 * can prompt the user to top up.
 */
export class InsufficientDiamondsError extends Error {
    code = 'INSUFFICIENT_DIAMONDS' as const;
    required: number;
    balance: number;

    constructor(required: number, balance: number) {
        super('Not enough diamonds');
        this.name = 'InsufficientDiamondsError';
        this.required = required;
        this.balance = balance;
    }
}

/**
 * Get a user's current diamond balance.
 */
export const getBalance = async (userId: string): Promise<number> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { diamonds: true },
    });
    return user?.diamonds ?? 0;
};

/**
 * Atomically debit diamonds from a user.
 *
 * Uses a conditional updateMany so the decrement only succeeds if the balance
 * is sufficient — this is race-safe even under concurrent requests (no
 * read-then-write gap). Returns the new balance.
 *
 * @throws InsufficientDiamondsError if the balance is too low.
 */
export const debitDiamonds = async (
    userId: string,
    amount: number,
): Promise<number> => {
    if (amount <= 0) {
        return getBalance(userId);
    }

    const result = await prisma.user.updateMany({
        where: { id: userId, diamonds: { gte: amount } },
        data: { diamonds: { decrement: amount } },
    });

    if (result.count === 0) {
        // Either the user doesn't exist or the balance was insufficient.
        const balance = await getBalance(userId);
        throw new InsufficientDiamondsError(amount, balance);
    }

    return getBalance(userId);
};

/**
 * Credit diamonds to a user (e.g. after a successful purchase or admin grant).
 * Returns the new balance.
 */
export const creditDiamonds = async (
    userId: string,
    amount: number,
): Promise<number> => {
    if (amount <= 0) {
        return getBalance(userId);
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: { diamonds: { increment: amount } },
        select: { diamonds: true },
    });

    return user.diamonds;
};
