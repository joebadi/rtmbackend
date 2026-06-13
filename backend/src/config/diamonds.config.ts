/**
 * Diamond economy configuration.
 *
 * Diamonds are RTM's in-app currency. They are spent on pay-per-use actions
 * (e.g. messaging users you haven't matched with) and topped up via purchases.
 *
 * This file is the single source of truth for diamond costs and the packages
 * users can buy. Keep it in sync with the mobile wallet UI.
 */

/**
 * What each diamond-charged action costs.
 */
export const DIAMOND_COSTS = {
    /** Diamonds charged per chat message for non-premium, non-matched users. */
    MESSAGE: 1,
    /**
     * Number of free messages each user may send in a conversation before
     * pay-per-message kicks in (the "icebreaker"). Matched users and premium
     * users are never charged.
     */
    FREE_ICEBREAKERS: 1,
} as const;

export type DiamondPackage = {
    id: string;
    diamonds: number;
    /** Extra diamonds granted on top of the base amount. */
    bonus: number;
    /** Price in the smallest currency unit is NOT used; this is the major unit (Naira). */
    price: number;
    currency: 'NGN';
    popular: boolean;
};

/**
 * Purchasable diamond packages. The backend is the source of truth for pricing
 * so the client cannot tamper with what it pays vs. what it receives.
 */
export const DIAMOND_PACKAGES: DiamondPackage[] = [
    { id: 'dp_100', diamonds: 100, bonus: 0, price: 1500, currency: 'NGN', popular: false },
    { id: 'dp_500', diamonds: 500, bonus: 50, price: 6500, currency: 'NGN', popular: true },
    { id: 'dp_1000', diamonds: 1000, bonus: 150, price: 12000, currency: 'NGN', popular: false },
    { id: 'dp_2500', diamonds: 2500, bonus: 500, price: 28000, currency: 'NGN', popular: false },
];

export const getPackageById = (id: string): DiamondPackage | undefined =>
    DIAMOND_PACKAGES.find((p) => p.id === id);
