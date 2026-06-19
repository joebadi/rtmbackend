import { prisma } from '../server';

const userSelect = {
    id: true,
    isOnline: true,
    isPremium: true,
    lastActive: true,
    profile: {
        include: {
            photos: { where: { isPrimary: true }, take: 1 },
        },
    },
};

const orderUsers = (ids: string[], users: any[]) => {
    const map = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => map.get(id)).filter(Boolean);
};

// ---------------------------------------------------------------- Saved

export const saveProfile = (userId: string, savedUserId: string) =>
    prisma.savedProfile.upsert({
        where: { userId_savedUserId: { userId, savedUserId } },
        create: { userId, savedUserId },
        update: {},
    });

export const unsaveProfile = async (userId: string, savedUserId: string) => {
    await prisma.savedProfile.deleteMany({ where: { userId, savedUserId } });
    return { message: 'Removed from saved' };
};

export const getSavedProfiles = async (userId: string) => {
    const rows = await prisma.savedProfile.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    const ids = rows.map((r) => r.savedUserId);
    if (!ids.length) return [];
    const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: userSelect,
    });
    return orderUsers(ids, users);
};

// --------------------------------------------------------------- Hidden

export const hideProfile = (userId: string, hiddenUserId: string) =>
    prisma.hiddenProfile.upsert({
        where: { userId_hiddenUserId: { userId, hiddenUserId } },
        create: { userId, hiddenUserId },
        update: {},
    });

export const unhideProfile = async (userId: string, hiddenUserId: string) => {
    await prisma.hiddenProfile.deleteMany({ where: { userId, hiddenUserId } });
    return { message: 'Unhidden' };
};

export const getHiddenProfiles = async (userId: string) => {
    const rows = await prisma.hiddenProfile.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { hiddenUser: { select: userSelect } },
    });
    return rows.map((r) => r.hiddenUser).filter(Boolean);
};

// -------------------------------------------------------------- Blocked

export const getBlockedProfiles = async (userId: string) => {
    const rows = await prisma.block.findMany({
        where: { blockerId: userId },
        orderBy: { createdAt: 'desc' },
        include: { blockedUser: { select: userSelect } },
    });
    return rows.map((r) => r.blockedUser).filter(Boolean);
};

// ------------------------------------------------ Feed exclusion helper

/**
 * IDs that should never appear in a user's discovery feeds: profiles they hid,
 * people they blocked, and people who blocked them.
 */
export const getExcludedUserIds = async (userId: string): Promise<string[]> => {
    const [hidden, blocked, blockedBy] = await Promise.all([
        prisma.hiddenProfile.findMany({
            where: { userId },
            select: { hiddenUserId: true },
        }),
        prisma.block.findMany({
            where: { blockerId: userId },
            select: { blockedUserId: true },
        }),
        prisma.block.findMany({
            where: { blockedUserId: userId },
            select: { blockerId: true },
        }),
    ]);
    return [
        ...hidden.map((h) => h.hiddenUserId),
        ...blocked.map((b) => b.blockedUserId),
        ...blockedBy.map((b) => b.blockerId),
    ];
};
