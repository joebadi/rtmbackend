-- CreateEnum
CREATE TYPE "LiveEventType" AS ENUM ('SPEED_DATING', 'BLIND_DATE');

-- CreateEnum
CREATE TYPE "LiveEventStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'BOOKING_OPEN', 'LOBBY', 'LIVE', 'POST_EVENT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('BOOKED', 'WAITLISTED', 'ATTENDED', 'NO_SHOW', 'CANCELLED');

-- CreateTable
CREATE TABLE "live_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "LiveEventType" NOT NULL,
    "status" "LiveEventStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "bookingOpensAt" TIMESTAMP(3) NOT NULL,
    "recurrence" TEXT,
    "capacity" INTEGER NOT NULL,
    "diamondCost" INTEGER NOT NULL DEFAULT 0,
    "roundSeconds" INTEGER NOT NULL DEFAULT 180,
    "maxRounds" INTEGER NOT NULL DEFAULT 8,
    "minProfileCompleteness" INTEGER NOT NULL DEFAULT 0,
    "requireVerified" BOOLEAN NOT NULL DEFAULT false,
    "genderBalanced" BOOLEAN NOT NULL DEFAULT true,
    "freeUnveils" INTEGER NOT NULL DEFAULT 3,
    "unveilCost" INTEGER NOT NULL DEFAULT 20,
    "coverImageUrl" TEXT,
    "createdByAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_event_bookings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED',
    "diamondsPaid" INTEGER NOT NULL DEFAULT 0,
    "joinedLobbyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_event_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_pairings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "aInterested" BOOLEAN,
    "bInterested" BOOLEAN,
    "aRating" INTEGER,
    "bRating" INTEGER,
    "isMatch" BOOLEAN NOT NULL DEFAULT false,
    "aUnveiledB" BOOLEAN NOT NULL DEFAULT false,
    "bUnveiledA" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "live_pairings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_events_status_startsAt_idx" ON "live_events"("status", "startsAt");

-- CreateIndex
CREATE INDEX "live_event_bookings_eventId_status_idx" ON "live_event_bookings"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "live_event_bookings_eventId_userId_key" ON "live_event_bookings"("eventId", "userId");

-- CreateIndex
CREATE INDEX "live_pairings_eventId_roundNumber_idx" ON "live_pairings"("eventId", "roundNumber");

-- AddForeignKey
ALTER TABLE "live_event_bookings" ADD CONSTRAINT "live_event_bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "live_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_event_bookings" ADD CONSTRAINT "live_event_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_pairings" ADD CONSTRAINT "live_pairings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "live_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

