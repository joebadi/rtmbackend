# Ready to Marry — Live Dates: Technical Specification

**Status:** Draft for review · **Owner:** RTM team · **RTC provider:** Agora
**Related:** [implementation_plan.md](./implementation_plan.md), diamonds economy (see `backend/src/config/diamonds.config.ts`)

---

## 1. Overview

**Live Dates** is RTM's flagship interactive feature: admin-scheduled, time-boxed events
where users meet through **timed 1:1 video/audio calls**, signal interest privately, and
walk away with real matches they can continue chatting with in the app.

Two event formats at launch:

| Format | Media | Photos | Hook |
|---|---|---|---|
| **Speed Dating** | Video | Visible | Rapid 1:1 video rounds; mutual interest = match |
| **Blind Date** | Audio | Hidden (profile data only) | Talk first, see later; 3 free unveils + paid unveils |

Events can be one-off or **recurring** (e.g. "Blind Date — every Friday 8pm"), have a
**capacity**, cost **diamonds** to attend, and are fully configured by admins.

---

## 2. Core concepts & lifecycle

```
DRAFT ─▶ SCHEDULED ─▶ BOOKING_OPEN ─▶ LOBBY ─▶ LIVE ─▶ POST_EVENT ─▶ COMPLETED
                                          │                 ▲
                                          └──── (rounds) ───┘
```

1. **Admin creates an event** (DRAFT) and publishes it (SCHEDULED).
2. **Booking opens** (`bookingOpensAt`): users see it on the Live Dates page and **book a
   slot**. Diamonds are charged/reserved on booking. Waitlist when full.
3. **Lobby** (a few minutes before `startsAt`): booked users join, countdown, mic/cam check,
   attendance confirmed. No-shows forfeit and are released.
4. **Live**: the server runs a **round scheduler** that pairs participants for timed 1:1
   calls (the "round-robin matchmaker"). Each round → one Agora channel for the pair.
5. During/after each pairing each user privately taps **Interested** or skips. **Mutual
   interest → a Match** (conversation auto-created). Non-mutual is invisible to the other side.
6. **Post-event**: rate each date; Blind Date users pick **3 free unveils** then pay diamonds
   for more; summary screen of matches.
7. **Completed**: event archived; stats available in admin.

### The round scheduler (the piece the original idea was missing)

Someone must decide *who talks to whom, when*. The server owns this:

- Rounds are sequential. Each round length = `roundSeconds` (admin-set, e.g. 180s) + a short
  buffer for transitions (e.g. 15s).
- A matchmaking pass each round pairs users who **haven't met yet** this event, only pairing
  **opposite genders** (`MALE`↔`FEMALE`), preferring those with the fewest completed rounds.
- Uneven counts → one or more users get a **sit-out** round (shown a "next round soon" screen);
  optionally credited a small diamond rebate for forced sit-outs.
- A user who leaves/declines mid-round: partner is returned to the pool and re-paired next
  round; leaver may incur a cooldown.
- Max rounds = `min(maxRounds, participantsOfOppositeGender)`.

Implemented as a per-event in-memory state machine driven by a timer, with state persisted to
the DB at each transition (so a server restart can resume). Socket.io broadcasts round
transitions to participants.

---

## 3. Data model (Prisma additions)

> All additive — no changes to existing tables except a back-relation on `User`.
> Requires a migration before deploy.

```prisma
model LiveEvent {
  id              String           @id @default(uuid())
  title           String
  description     String?
  type            LiveEventType                     // SPEED_DATING | BLIND_DATE
  status          LiveEventStatus  @default(DRAFT)

  // Scheduling
  startsAt        DateTime
  bookingOpensAt  DateTime
  recurrence      String?                           // null = one-off, else RRULE/cron e.g. "FRI 20:00"

  // Rules
  capacity        Int                               // max participants
  diamondCost     Int              @default(0)       // cost to attend
  roundSeconds    Int              @default(180)     // per-call duration
  maxRounds       Int              @default(8)
  minProfileCompleteness Int       @default(0)
  requireVerified Boolean          @default(false)
  genderBalanced  Boolean          @default(true)
  freeUnveils     Int              @default(3)       // Blind Date only
  unveilCost      Int              @default(20)      // diamonds per extra unveil

  coverImageUrl   String?
  createdByAdmin  String?

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  bookings        LiveEventBooking[]
  pairings        LivePairing[]

  @@index([status, startsAt])
  @@map("live_events")
}

enum LiveEventType   { SPEED_DATING  BLIND_DATE }
enum LiveEventStatus { DRAFT SCHEDULED BOOKING_OPEN LOBBY LIVE POST_EVENT COMPLETED CANCELLED }

model LiveEventBooking {
  id           String       @id @default(uuid())
  eventId      String
  event        LiveEvent    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId       String
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  status       BookingStatus @default(BOOKED)        // BOOKED WAITLISTED ATTENDED NO_SHOW CANCELLED
  diamondsPaid Int          @default(0)
  joinedLobbyAt DateTime?
  createdAt    DateTime     @default(now())

  @@unique([eventId, userId])
  @@index([eventId, status])
  @@map("live_event_bookings")
}

enum BookingStatus { BOOKED WAITLISTED ATTENDED NO_SHOW CANCELLED }

model LivePairing {
  id           String     @id @default(uuid())
  eventId      String
  event        LiveEvent  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  roundNumber  Int
  userAId      String
  userBId      String
  channelName  String                                // Agora channel
  startedAt    DateTime?
  endedAt      DateTime?

  // Private interest signals (never exposed to the other user unless mutual)
  aInterested  Boolean?
  bInterested  Boolean?
  aRating      Int?
  bRating      Int?
  isMatch      Boolean    @default(false)

  // Blind Date unveils
  aUnveiledB   Boolean    @default(false)
  bUnveiledA   Boolean    @default(false)

  @@index([eventId, roundNumber])
  @@map("live_pairings")
}
```

Add to `User`:
```prisma
  liveBookings   LiveEventBooking[]
```

---

## 4. Agora integration

**Why Agora:** mature Flutter SDK (`agora_rtc_engine`), audio-only mode (Blind Date), 1:1 and
group channels, per-minute pricing, and **server-side token auth** so the backend controls who
joins which channel.

### Backend
- Add `agora-token` (`agora-access-token`) package to mint **RTC tokens**.
- New env vars: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`.
- `agora.service.ts`:
  - `generateRtcToken(channelName, uid, role, ttlSeconds)` → short-lived token.
  - Channel naming: `live_{eventId}_{roundNumber}_{pairingId}` (unique per pairing).
- Tokens are issued **only** to the two users in a `LivePairing` for that round, only while the
  round is active. No token = can't join. This is the security boundary.

### Flutter
- Add `agora_rtc_engine` + `permission_handler` to `pubspec.yaml`.
- A `LiveCallScreen` that joins the channel with the server-issued token; for Blind Date,
  `enableVideo()` is **not** called (audio only) and the partner card shows blurred art +
  profile data.
- Mute / camera toggle / end-call / report controls.

**Recording:** recommended **off** at launch (privacy + cost). If needed later, use Agora Cloud
Recording for moderation only, with explicit consent.

---

## 5. API surface

### User-facing (`/api/live`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/live/events` | List upcoming/live events (with my booking status) |
| GET | `/live/events/:id` | Event detail + attendee preview (respecting blind rules) |
| POST | `/live/events/:id/book` | Book a slot (charges diamonds; waitlist if full) |
| DELETE | `/live/events/:id/book` | Cancel booking (refund per policy) |
| POST | `/live/events/:id/lobby` | Join lobby / mark present |
| GET | `/live/events/:id/state` | Current round, my current pairing, time remaining |
| POST | `/live/pairings/:id/token` | Get an Agora token for my active pairing |
| POST | `/live/pairings/:id/interest` | `{ interested: bool }` (private) |
| POST | `/live/pairings/:id/rate` | `{ rating: 1..5 }` |
| POST | `/live/pairings/:id/unveil` | Blind Date: spend diamonds/free quota to reveal |
| GET | `/live/events/:id/results` | Post-event matches + remaining free unveils |
| POST | `/live/pairings/:id/report` | Safety report (also via existing reports) |

### Admin (`/api/admin/live`)
| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/admin/live/events` | List / create events |
| PUT/DELETE | `/admin/live/events/:id` | Edit / cancel |
| POST | `/admin/live/events/:id/publish` | DRAFT → SCHEDULED |
| GET | `/admin/live/events/:id/stats` | Bookings, attendance, matches, revenue |

### Socket.io events (namespace or room `live:{eventId}`)
- Server→client: `live:lobby_update`, `live:round_start` (`{ pairingId, channelName, partner, roundSeconds }`), `live:round_end`, `live:sit_out`, `live:event_ended`, `live:matched`.
- Client→server: handled via REST (interest/rate) to keep them auditable; socket is for real-time push only.

---

## 6. Monetization & diamonds

Reuses the diamond economy already built (`diamond.service.ts`, atomic debit/credit):

- **Entry fee**: `event.diamondCost` debited on booking. Refund on admin cancellation or
  technical failure (credit back).
- **Extra unveils** (Blind Date): first `freeUnveils` free; each additional costs `unveilCost`.
- **Call extension** (optional, Speed Dating): both users spend diamonds to add time.
- **Premium interplay** (to confirm): premium users could get free/discounted entry or priority
  booking — recommend **discount + priority**, not fully free, to preserve diamond sinks.

All spends go through `debitDiamonds` (race-safe, throws `INSUFFICIENT_DIAMONDS`). Bookings that
fail to charge are not created.

---

## 7. Safety, fairness & edge cases

- **Eligibility gate**: `minProfileCompleteness`, `requireVerified`, age, not banned/blocked.
- **In-call**: mute, end, **report** (auto-ends call, flags to admin via existing `Report`),
  block carries over (blocked users never paired).
- **No-show / leaver**: forfeit entry diamonds, short cooldown, partner re-paired or credited.
- **Refund policy**: admin cancel → full refund; user cancels before `bookingOpensAt+window` →
  full; after lobby → none; technical failure (event never ran) → full.
- **Gender imbalance**: balanced pairing + sit-out rebates; admin sees projected balance before
  going live.
- **Resilience**: round state persisted each transition; server restart resumes mid-event.
- **Privacy**: interest signals and "skips" are never revealed; Blind Date photos served only
  after an unveil is recorded server-side (don't ship the photo URL to the client early).

---

## 8. Admin dashboard (Next.js)

New `dashboard/live/` section:
- Events table (status, schedule, capacity, bookings, revenue).
- Create/edit form: title, type, schedule + recurrence, capacity, diamond cost, round length,
  max rounds, eligibility, blind-unveil settings, cover image.
- Live monitor: current round, attendee count, reports, ability to force-end.
- Post-event stats: attendance, matches made, diamonds earned/refunded.

---

## 9. Delivery phases

1. **Schema + admin CRUD** — models, migration, admin create/list/publish. (No realtime yet.)
2. **Booking + diamonds + Live Dates list UI** — replace the mocked `live_dates_screen.dart`
   with real events, booking, capacity/waitlist.
3. **Agora plumbing** — token service, env, Flutter SDK, a manual 1:1 test call.
4. **Round scheduler + lobby/live flow** — the state machine, sockets, pairing, timed calls.
5. **Interest → match, ratings, Blind Date unveils** — wire to existing likes/conversations.
6. **Post-event results, refunds, safety/reporting, admin live monitor.**
7. **Polish, load test, recording decision.**

---

## 10. Open decisions (confirm before Phase 1)

- Premium interplay with entry fee (recommend discount + priority booking).
- Exact diamond prices: entry, unveil, extension.
- Default round length & max rounds.
- Recurrence format (simple weekday/time vs full RRULE).
- Recording: off at launch? (recommended yes/off.)
- Refund windows.

---

## 11. New dependencies & config summary

**Backend:** `agora-access-token`; env `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`.
**Flutter:** `agora_rtc_engine`, `permission_handler`; camera/mic permissions in
`AndroidManifest.xml` / `Info.plist`.
**No third-party** needed for the scheduler/booking — handled in our backend + Socket.io.
