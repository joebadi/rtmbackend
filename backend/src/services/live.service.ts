import { prisma } from '../server';
import { debitDiamonds, creditDiamonds } from './diamond.service';

/**
 * Live Dates service — Phase 1: event catalogue, booking, and admin CRUD.
 * (The realtime lobby / round scheduler / Agora calls are later phases.)
 */

const BOOKABLE_STATUSES = ['SCHEDULED', 'BOOKING_OPEN'] as const;
const VISIBLE_STATUSES = ['SCHEDULED', 'BOOKING_OPEN', 'LOBBY', 'LIVE'] as const;

/** How many attendees currently hold a live slot (booked or attended). */
const countActiveBookings = (eventId: string) =>
    prisma.liveEventBooking.count({
        where: { eventId, status: { in: ['BOOKED', 'ATTENDED'] } },
    });

/**
 * Shape an event for the mobile client, including the viewer's booking status
 * and a small attendee preview (photos hidden for Blind Date events).
 */
const decorateEvent = async (event: any, userId?: string) => {
    const bookedCount = await countActiveBookings(event.id);

    const myBooking = userId
        ? await prisma.liveEventBooking.findUnique({
              where: { eventId_userId: { eventId: event.id, userId } },
              select: { status: true, diamondsPaid: true },
          })
        : null;

    // Attendee avatars — only for non-blind events (Blind Date hides photos).
    let attendeePreview: string[] = [];
    if (event.type !== 'BLIND_DATE') {
        const previews = await prisma.liveEventBooking.findMany({
            where: { eventId: event.id, status: { in: ['BOOKED', 'ATTENDED'] } },
            take: 8,
            orderBy: { createdAt: 'asc' },
            select: {
                user: {
                    select: {
                        profile: {
                            select: { photos: { where: { isPrimary: true }, take: 1, select: { url: true } } },
                        },
                    },
                },
            },
        });
        attendeePreview = previews
            .map((b) => b.user?.profile?.photos?.[0]?.url)
            .filter((u): u is string => !!u);
    }

    return {
        ...event,
        bookedCount,
        spotsLeft: Math.max(0, event.capacity - bookedCount),
        isFull: bookedCount >= event.capacity,
        isBookable: (BOOKABLE_STATUSES as readonly string[]).includes(event.status),
        myBookingStatus: myBooking?.status ?? null,
        attendeePreview,
    };
};

// ============================================
// USER-FACING
// ============================================

/** Upcoming + live events for the mobile Live Dates page. */
export const listEvents = async (userId: string) => {
    const events = await prisma.liveEvent.findMany({
        where: { status: { in: VISIBLE_STATUSES as unknown as any[] } },
        orderBy: { startsAt: 'asc' },
    });
    return Promise.all(events.map((e) => decorateEvent(e, userId)));
};

export const getEvent = async (userId: string, eventId: string) => {
    const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');
    return decorateEvent(event, userId);
};

/**
 * Book a slot. Charges diamonds when a real slot is granted; over-capacity
 * bookings go on the waitlist (not charged until promoted).
 */
export const bookEvent = async (userId: string, eventId: string) => {
    const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');
    if (!(BOOKABLE_STATUSES as readonly string[]).includes(event.status)) {
        throw new Error('This event is not open for booking');
    }

    // Already booked?
    const existing = await prisma.liveEventBooking.findUnique({
        where: { eventId_userId: { eventId, userId } },
    });
    if (existing && existing.status !== 'CANCELLED') {
        throw new Error('You have already booked this event');
    }

    // Eligibility checks.
    const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { profileCompleteness: true },
    });
    if ((profile?.profileCompleteness ?? 0) < event.minProfileCompleteness) {
        throw new Error('Complete your profile to join this event');
    }
    if (event.requireVerified) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { isPhoneVerified: true } });
        if (!user?.isPhoneVerified) throw new Error('Only verified users can join this event');
    }

    const activeCount = await countActiveBookings(eventId);
    const hasSpot = activeCount < event.capacity;

    // Charge diamonds only for a confirmed slot (throws INSUFFICIENT_DIAMONDS).
    let diamondsPaid = 0;
    if (hasSpot && event.diamondCost > 0) {
        await debitDiamonds(userId, event.diamondCost);
        diamondsPaid = event.diamondCost;
    }

    const status = hasSpot ? 'BOOKED' : 'WAITLISTED';

    const booking = existing
        ? await prisma.liveEventBooking.update({
              where: { id: existing.id },
              data: { status, diamondsPaid },
          })
        : await prisma.liveEventBooking.create({
              data: { eventId, userId, status, diamondsPaid },
          });

    // Notify the user.
    await prisma.notification.create({
        data: {
            userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: hasSpot ? 'You\'re booked!' : 'You\'re on the waitlist',
            body: hasSpot
                ? `Your slot for "${event.title}" is confirmed.`
                : `"${event.title}" is full — we'll let you know if a spot opens.`,
            data: { eventId },
        },
    });

    return booking;
};

/** Cancel a booking; refunds diamonds if the event hasn't started. */
export const cancelBooking = async (userId: string, eventId: string) => {
    const booking = await prisma.liveEventBooking.findUnique({
        where: { eventId_userId: { eventId, userId } },
    });
    if (!booking || booking.status === 'CANCELLED') {
        throw new Error('No active booking found');
    }

    const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    const refundable = event && new Date() < event.startsAt;

    if (refundable && booking.diamondsPaid > 0) {
        await creditDiamonds(userId, booking.diamondsPaid);
    }

    await prisma.liveEventBooking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', diamondsPaid: 0 },
    });

    return { refunded: refundable ? booking.diamondsPaid : 0 };
};

// ============================================
// ADMIN
// ============================================

export const adminListEvents = async () => {
    const events = await prisma.liveEvent.findMany({ orderBy: { startsAt: 'desc' } });
    return Promise.all(
        events.map(async (e) => ({
            ...e,
            bookedCount: await countActiveBookings(e.id),
        })),
    );
};

export const adminCreateEvent = async (adminId: string, data: any) => {
    return prisma.liveEvent.create({
        data: { ...data, createdByAdmin: adminId, status: 'DRAFT' },
    });
};

export const adminUpdateEvent = async (eventId: string, data: any) => {
    return prisma.liveEvent.update({ where: { id: eventId }, data });
};

/** DRAFT → SCHEDULED (publishes it to users). */
export const adminPublishEvent = async (eventId: string) => {
    const event = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new Error('Event not found');
    if (event.status !== 'DRAFT' && event.status !== 'CANCELLED') {
        throw new Error('Only draft events can be published');
    }
    return prisma.liveEvent.update({ where: { id: eventId }, data: { status: 'SCHEDULED' } });
};

/** Cancel an event and refund every active booking. */
export const adminCancelEvent = async (eventId: string) => {
    const bookings = await prisma.liveEventBooking.findMany({
        where: { eventId, status: { in: ['BOOKED', 'WAITLISTED'] } },
    });

    for (const b of bookings) {
        if (b.diamondsPaid > 0) await creditDiamonds(b.userId, b.diamondsPaid);
        await prisma.liveEventBooking.update({
            where: { id: b.id },
            data: { status: 'CANCELLED', diamondsPaid: 0 },
        });
        await prisma.notification.create({
            data: {
                userId: b.userId,
                type: 'SYSTEM_ANNOUNCEMENT',
                title: 'Event cancelled',
                body: 'A Live Dates event you booked was cancelled and your diamonds refunded.',
                data: { eventId },
            },
        });
    }

    return prisma.liveEvent.update({ where: { id: eventId }, data: { status: 'CANCELLED' } });
};

export const adminGetStats = async (eventId: string) => {
    const [event, bookings, attended, matches] = await Promise.all([
        prisma.liveEvent.findUnique({ where: { id: eventId } }),
        prisma.liveEventBooking.count({ where: { eventId } }),
        prisma.liveEventBooking.count({ where: { eventId, status: 'ATTENDED' } }),
        prisma.livePairing.count({ where: { eventId, isMatch: true } }),
    ]);
    if (!event) throw new Error('Event not found');

    const paidBookings = await prisma.liveEventBooking.findMany({
        where: { eventId, status: { in: ['BOOKED', 'ATTENDED'] } },
        select: { diamondsPaid: true },
    });
    const diamondRevenue = paidBookings.reduce((sum, b) => sum + b.diamondsPaid, 0);

    return { event, totalBookings: bookings, attended, matches, diamondRevenue };
};
