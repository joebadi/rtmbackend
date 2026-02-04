# RTM App - Unified Implementation Plan

**Version:** 6.0 - Unified Architecture with Remote Development  
**Date:** January 19, 2026  
**Status:** Ready for Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Unified Architecture](#unified-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Architecture](#database-architecture)
6. [Complete API Specification](#complete-api-specification)
7. [Admin Dashboard](#admin-dashboard)
8. [Remote Development Workflow](#remote-development-workflow)
9. [Deployment Strategy](#deployment-strategy)
10. [Implementation Timeline](#implementation-timeline)

---

## Executive Summary

### Project Scope

**Unified Backend + Admin:** Node.js/Express/PostgreSQL/Prisma + Next.js  
**Mobile:** Flutter (existing - 31 screens)  
**Hosting:** Contabo VPS (Ubuntu 22.04)  
**Development:** Remote via VS Code SSH  
**Timeline:** 14 weeks to production launch

### Current Status

- ✅ **Flutter UI:** 100% Complete (31 screens)
- ✅ **Contabo VPS:** Ready and accessible
- ✅ **Subdomain Folder:** `/home/joeey/rtmadmin.e-clicks.net/` created
- ❌ **Backend API:** 0% Complete (starting fresh)
- ❌ **Admin Web:** 0% Complete (starting fresh)
- ❌ **Infrastructure:** PostgreSQL, Nginx, PM2 need setup

### Key Features

**Core Features:**
- User authentication & profiles
- Location-based matching (PostGIS)
- Real-time messaging (Socket.io)
- Likes & interactions
- Premium subscriptions
- Payment integration (Paystack, PayPal, Google Play)

**Production Features:**
- Push notifications (FCM)
- Email/SMS notifications
- File upload (Cloudinary)
- Admin dashboard with analytics
- Backup & disaster recovery
- Monitoring & logging

---

## Unified Architecture

### Single Project Structure

```
rtmadmin.e-clicks.net (Subdomain + Directory)
├── Backend API (Node.js/Express/TypeScript)
│   ├── Serves Mobile App (/api/*)
│   ├── Serves Admin Dashboard (/api/admin/*)
│   └── Real-time with Socket.io
│
└── Admin Web Interface (Next.js 14)
    ├── Dashboard UI
    ├── User Management
    ├── Analytics & Reports
    └── Calls Backend API
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│         Contabo VPS (Ubuntu 22.04 LTS)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  /home/joeey/rtmadmin.e-clicks.net/                    │
│  ├── backend/          (Node.js API)                   │
│  │   ├── src/                                          │
│  │   ├── prisma/                                       │
│  │   └── dist/        (compiled TypeScript)           │
│  │                                                      │
│  └── admin/            (Next.js Dashboard)             │
│      ├── app/                                          │
│      ├── components/                                   │
│      └── .next/        (production build)             │
│                                                         │
│  ┌──────────────────────────────────────┐             │
│  │   PostgreSQL 15 + PostGIS            │             │
│  │   Database: rtm_production           │             │
│  └──────────────────────────────────────┘             │
│                                                         │
│  ┌──────────────────────────────────────┐             │
│  │   Nginx (Reverse Proxy)              │             │
│  │   - rtmadmin.e-clicks.net → :3000    │             │
│  │   - rtmadmin.e-clicks.net/api → :4000│             │
│  │   - SSL: Let's Encrypt               │             │
│  └──────────────────────────────────────┘             │
│                                                         │
│  ┌──────────────────────────────────────┐             │
│  │   PM2 Process Manager                │             │
│  │   - rtm-backend (port 4000)          │             │
│  │   - rtm-admin (port 3000)            │             │
│  └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
    Flutter App              VS Code Remote SSH
  (Mobile Users)            (Development)
```

### URL Structure

- **Admin Dashboard:** `https://rtmadmin.e-clicks.net/`
- **Backend API:** `https://rtmadmin.e-clicks.net/api/*`
- **Admin API:** `https://rtmadmin.e-clicks.net/api/admin/*`
- **Socket.io:** `wss://rtmadmin.e-clicks.net/socket.io`

---

## Technology Stack

### Backend API

```yaml
Runtime: Node.js 20+
Framework: Express.js 4.18+
Language: TypeScript 5+
Database: PostgreSQL 15+ (with PostGIS)
ORM: Prisma 5+
Authentication: JWT + bcryptjs
Real-time: Socket.io 4+
Validation: Zod
File Upload: Multer + Cloudinary
Email: Nodemailer
SMS: Twilio
Push Notifications: Firebase Admin SDK
Logging: Winston
```

### Admin Dashboard

```yaml
Framework: Next.js 14 (App Router)
Language: TypeScript
UI Library: Tailwind CSS + shadcn/ui
State Management: Zustand
Data Fetching: TanStack Query (React Query)
Charts: Recharts
Tables: TanStack Table
Forms: React Hook Form + Zod
Icons: Lucide React
```

### Payments

```yaml
Paystack: paystack npm package
PayPal: @paypal/checkout-server-sdk
Google Play: google-play-billing-validator
```

### Infrastructure

```yaml
Hosting: Contabo VPS (Ubuntu 22.04)
Database: PostgreSQL 15 + PostGIS (on VPS)
File Storage: Cloudinary
Process Manager: PM2
Reverse Proxy: Nginx
SSL: Let's Encrypt (Certbot)
Monitoring: PM2 + Winston Logs
Backup: Automated cron jobs
```

### Mobile (Existing)

```yaml
Framework: Flutter 3.16+
State: Provider
Navigation: GoRouter
HTTP: Dio
Storage: flutter_secure_storage
Real-time: socket_io_client
Payments: in_app_purchase
Push: firebase_messaging
```

---

## Project Structure

### Backend Directory Structure

```
/home/joeey/rtmadmin.e-clicks.net/backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── profile.controller.ts
│   │   ├── match.controller.ts
│   │   ├── message.controller.ts
│   │   ├── payment.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── profile.service.ts
│   │   ├── match.service.ts
│   │   ├── message.service.ts
│   │   ├── payment.service.ts
│   │   ├── notification.service.ts
│   │   └── admin.service.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── admin.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── profile.routes.ts
│   │   ├── match.routes.ts
│   │   ├── message.routes.ts
│   │   ├── payment.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── cloudinary.util.ts
│   │   ├── email.util.ts
│   │   ├── sms.util.ts
│   │   └── logger.util.ts
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── profile.validator.ts
│   │   └── payment.validator.ts
│   │
│   ├── socket/
│   │   ├── socket.handler.ts
│   │   └── events.ts
│   │
│   ├── app.ts          (Express app setup)
│   └── server.ts       (Entry point)
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── dist/               (Compiled TypeScript)
├── uploads/            (Temporary file uploads)
├── logs/               (Application logs)
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── ecosystem.config.js (PM2 config)
```

### Admin Dashboard Structure

```
/home/joeey/rtmadmin.e-clicks.net/admin/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── reports/
│   │   ├── verifications/
│   │   ├── transactions/
│   │   ├── analytics/
│   │   └── layout.tsx
│   │
│   ├── api/            (API routes if needed)
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/             (shadcn/ui components)
│   ├── charts/
│   ├── tables/
│   └── forms/
│
├── lib/
│   ├── api.ts          (API client)
│   ├── auth.ts
│   └── utils.ts
│
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
│
├── store/
│   └── authStore.ts    (Zustand)
│
├── types/
│   └── index.ts
│
├── public/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## Database Architecture (PostgreSQL + Prisma)

### Complete Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// ============================================
// USERS & AUTHENTICATION
// ============================================

model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  phoneNumber        String    @unique
  password           String
  isEmailVerified    Boolean   @default(false)
  isPhoneVerified    Boolean   @default(false)
  isPremium          Boolean   @default(false)
  premiumExpiryDate  DateTime?
  diamonds           Int       @default(0)
  isOnline           Boolean   @default(false)
  lastActive         DateTime  @default(now())
  deviceToken        String?   // FCM token
  refreshToken       String?
  passwordResetToken String?
  passwordResetExpiry DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  profile            Profile?
  matchPreferences   MatchPreferences?
  sentMessages       Message[]         @relation("SentMessages")
  receivedMessages   Message[]         @relation("ReceivedMessages")
  conversations      ConversationParticipant[]
  sentLikes          Like[]            @relation("SentLikes")
  receivedLikes      Like[]            @relation("ReceivedLikes")
  blockedUsers       Block[]           @relation("Blocker")
  blockedBy          Block[]           @relation("Blocked")
  reports            Report[]          @relation("Reporter")
  reportedBy         Report[]          @relation("Reported")
  transactions       Transaction[]
  verificationReq    VerificationRequest?
  savedProfiles      SavedProfile[]
  profileViews       ProfileView[]     @relation("Viewer")
  viewedBy           ProfileView[]     @relation("Viewed")
  notifications      Notification[]
  sessions           Session[]

  @@index([email])
  @@index([phoneNumber])
  @@index([isOnline, lastActive])
  @@index([isPremium])
  @@map("users")
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token        String   @unique
  ipAddress    String?
  userAgent    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([token])
  @@map("sessions")
}

// ============================================
// PROFILES
// ============================================

model Profile {
  id                 String    @id @default(uuid())
  userId             String    @unique
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Basic Information
  firstName          String
  lastName           String
  dateOfBirth        DateTime
  age                Int
  gender             Gender
  zodiacSign         String
  aboutMe            String?
  hobbies            String?

  // Location (PostGIS)
  city               String?
  state              String?
  country            String?
  latitude           Float?
  longitude          Float?
  location           Unsupported("geography(Point, 4326)")?

  // Ethnicity
  ethnicityCountry   String?
  stateOfOrigin      String?
  tribe              String?

  // Personal Details
  relationshipStatus String?
  language           String    @default("English")
  workStatus         String?
  education          String?
  religion           String?
  personalityType    String?
  divorceView        String?

  // Physical Attributes
  height             String?
  bodyType           String?
  skinColor          String?
  eyeColor           String?
  hasTattoos         Boolean   @default(false)
  hasPiercings       Boolean   @default(false)
  isHairy            Boolean   @default(false)
  hasTribalMarks     Boolean   @default(false)
  bestFeature        String?

  // Medical Information
  genotype           String?
  bloodGroup         String?
  hivPartnerView     String?

  // Lifestyle
  drinkingStatus     String?
  smokingStatus      String?
  hasChildren        String?
  livingConditions   String?

  // Privacy Settings
  showOnMap          Boolean   @default(true)
  isAnonymous        Boolean   @default(false)
  pushNotifications  Boolean   @default(true)
  emailNotifications Boolean   @default(true)
  smsNotifications   Boolean   @default(false)

  // Stats
  profileCompleteness Int      @default(0)
  viewCount          Int       @default(0)
  likeCount          Int       @default(0)

  // Account Status
  isActive           Boolean   @default(true)
  isBanned           Boolean   @default(false)
  bannedReason       String?
  bannedUntil        DateTime?

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  photos             Photo[]

  @@index([userId])
  @@index([age, gender])
  @@index([country, state])
  @@index([isActive, isBanned])
  @@map("profiles")
}

enum Gender {
  MALE
  FEMALE
}

model Photo {
  id         String    @id @default(uuid())
  profileId  String
  profile    Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  url        String
  publicId   String
  isPrimary  Boolean   @default(false)
  isVerified Boolean   @default(false)
  uploadedAt DateTime  @default(now())

  @@index([profileId])
  @@index([isPrimary])
  @@map("photos")
}

// ============================================
// MATCH PREFERENCES
// ============================================

model MatchPreferences {
  id                      String   @id @default(uuid())
  userId                  String   @unique
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  ageMin                  Int
  ageMax                  Int
  ageIsDealBreaker        Boolean  @default(false)

  relationshipStatus      String[]
  relationshipIsDealBreaker Boolean @default(false)

  locationCountry         String?
  locationStates          String[]
  locationTribes          String[]
  locationIsDealBreaker   Boolean  @default(false)

  religion                String[]
  religionIsDealBreaker   Boolean  @default(false)

  zodiac                  String[]
  zodiacIsDealBreaker     Boolean  @default(false)

  genotype                String[]
  genotypeIsDealBreaker   Boolean  @default(false)

  bloodGroup              String[]
  bloodGroupIsDealBreaker Boolean  @default(false)

  heightMin               Int?
  heightMax               Int?
  heightIsDealBreaker     Boolean  @default(false)

  bodyType                String[]
  bodyTypeIsDealBreaker   Boolean  @default(false)

  tattoosAcceptable       Boolean?
  tattoosIsDealBreaker    Boolean  @default(false)

  piercingsAcceptable     Boolean?
  piercingsIsDealBreaker  Boolean  @default(false)

  updatedAt               DateTime @updatedAt

  @@index([userId])
  @@map("match_preferences")
}

// ============================================
// MESSAGING
// ============================================

model Conversation {
  id           String                      @id @default(uuid())
  createdAt    DateTime                    @default(now())
  updatedAt    DateTime                    @updatedAt

  participants ConversationParticipant[]
  messages     Message[]

  @@map("conversations")
}

model ConversationParticipant {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  unreadCount    Int          @default(0)
  joinedAt       DateTime     @default(now())

  @@unique([conversationId, userId])
  @@index([userId])
  @@map("conversation_participants")
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  receiverId     String
  receiver       User         @relation("ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade)
  messageType    MessageType
  content        String?
  imageUrl       String?
  isRead         Boolean      @default(false)
  readAt         DateTime?
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
  @@index([senderId])
  @@index([receiverId])
  @@map("messages")
}

enum MessageType {
  TEXT
  IMAGE
  EMOJI
}

// ============================================
// LIKES & INTERACTIONS
// ============================================

model Like {
  id          String   @id @default(uuid())
  likerId     String
  liker       User     @relation("SentLikes", fields: [likerId], references: [id], onDelete: Cascade)
  likedUserId String
  likedUser   User     @relation("ReceivedLikes", fields: [likedUserId], references: [id], onDelete: Cascade)
  isMutual    Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@unique([likerId, likedUserId])
  @@index([likedUserId, isMutual])
  @@map("likes")
}

model SavedProfile {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  savedUserId String
  createdAt   DateTime @default(now())

  @@unique([userId, savedUserId])
  @@index([userId])
  @@map("saved_profiles")
}

model ProfileView {
  id         String   @id @default(uuid())
  viewerId   String
  viewer     User     @relation("Viewer", fields: [viewerId], references: [id], onDelete: Cascade)
  viewedId   String
  viewed     User     @relation("Viewed", fields: [viewedId], references: [id], onDelete: Cascade)
  viewedAt   DateTime @default(now())

  @@index([viewedId])
  @@index([viewerId])
  @@map("profile_views")
}

model Block {
  id             String   @id @default(uuid())
  blockerId      String
  blocker        User     @relation("Blocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blockedUserId  String
  blockedUser    User     @relation("Blocked", fields: [blockedUserId], references: [id], onDelete: Cascade)
  reason         String?
  createdAt      DateTime @default(now())

  @@unique([blockerId, blockedUserId])
  @@index([blockerId])
  @@map("blocks")
}

model Report {
  id               String       @id @default(uuid())
  reporterId       String
  reporter         User         @relation("Reporter", fields: [reporterId], references: [id], onDelete: Cascade)
  reportedUserId   String
  reportedUser     User         @relation("Reported", fields: [reportedUserId], references: [id], onDelete: Cascade)
  reason           ReportReason
  description      String?
  status           ReportStatus @default(PENDING)
  reviewedBy       String?
  reviewNotes      String?
  createdAt        DateTime     @default(now())
  resolvedAt       DateTime?

  @@index([reportedUserId, status])
  @@index([status])
  @@map("reports")
}

enum ReportReason {
  INAPPROPRIATE_PHOTOS
  FAKE_PROFILE
  HARASSMENT
  SPAM
  OTHER
}

enum ReportStatus {
  PENDING
  REVIEWED
  RESOLVED
}

// ============================================
// PAYMENTS
// ============================================

model Transaction {
  id              String            @id @default(uuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  type            TransactionType
  amount          Float
  currency        String
  paymentMethod   PaymentMethod
  paymentProvider String
  transactionId   String            @unique
  reference       String            @unique
  status          TransactionStatus
  metadata        Json?
  createdAt       DateTime          @default(now())
  completedAt     DateTime?

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("transactions")
}

enum TransactionType {
  PREMIUM_MONTHLY
  PREMIUM_YEARLY
  DIAMONDS
}

enum PaymentMethod {
  PAYSTACK
  PAYPAL
  GOOGLE_PLAY
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

// ============================================
// NOTIFICATIONS
// ============================================

model Notification {
  id        String           @id @default(uuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  body      String
  data      Json?
  isRead    Boolean          @default(false)
  readAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
  @@map("notifications")
}

enum NotificationType {
  NEW_LIKE
  MUTUAL_MATCH
  NEW_MESSAGE
  PROFILE_VIEW
  VERIFICATION_APPROVED
  VERIFICATION_REJECTED
  PREMIUM_EXPIRING
  SYSTEM_ANNOUNCEMENT
}

// ============================================
// VERIFICATION
// ============================================

model VerificationRequest {
  id          String             @id @default(uuid())
  userId      String             @unique
  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents   Json
  status      VerificationStatus @default(PENDING)
  reviewedBy  String?
  reviewNotes String?
  createdAt   DateTime           @default(now())
  reviewedAt  DateTime?

  @@index([status])
  @@map("verification_requests")
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
}

// ============================================
// ADMIN
// ============================================

model AdminUser {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  name      String
  role      AdminRole
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  auditLogs AuditLog[]

  @@map("admin_users")
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
  MODERATOR
}

model AuditLog {
  id          String    @id @default(uuid())
  adminId     String
  admin       AdminUser @relation(fields: [adminId], references: [id])
  action      String
  targetType  String?
  targetId    String?
  details     Json?
  ipAddress   String?
  createdAt   DateTime  @default(now())

  @@index([adminId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## Complete API Specification

### Base URL
```
https://rtmadmin.e-clicks.net/api
```

### Authentication APIs (8 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/send-otp` | Send OTP for verification | No |
| POST | `/auth/verify-otp` | Verify OTP | No |
| POST | `/auth/login` | User login | No |
| POST | `/auth/refresh-token` | Refresh JWT token | Yes |
| POST | `/auth/logout` | User logout | Yes |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password | No |

### Profile APIs (12 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/profile/create` | Create user profile | Yes |
| GET | `/profile/me` | Get own profile | Yes |
| GET | `/profile/:userId` | Get user profile by ID | Yes |
| PUT | `/profile/update` | Update profile | Yes |
| POST | `/profile/upload-photo` | Upload profile photo | Yes |
| DELETE | `/profile/photo/:photoId` | Delete photo | Yes |
| PUT | `/profile/photo/:photoId/set-primary` | Set primary photo | Yes |
| GET | `/profile/stats` | Get profile statistics | Yes |
| PUT | `/profile/privacy-settings` | Update privacy settings | Yes |
| DELETE | `/profile/delete-account` | Delete account | Yes |
| GET | `/profile/views` | Get profile views | Yes |
| POST | `/profile/track-view/:userId` | Track profile view | Yes |

### Match Preferences APIs (3 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/preferences/create` | Create match preferences | Yes |
| GET | `/preferences/me` | Get own preferences | Yes |
| PUT | `/preferences/update` | Update preferences | Yes |

### Matching APIs (5 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/matches/explore` | Get potential matches | Yes |
| POST | `/matches/filter` | Filter matches | Yes |
| GET | `/matches/compatibility/:targetUserId` | Get compatibility score | Yes |
| GET | `/matches/suggestions` | Get match suggestions | Yes |
| GET | `/matches/nearby` | Get nearby users | Yes |

### Messaging APIs (7 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/messages/conversations` | Get all conversations | Yes |
| GET | `/messages/:conversationId` | Get messages in conversation | Yes |
| POST | `/messages/send` | Send message | Yes |
| PUT | `/messages/:messageId/read` | Mark message as read | Yes |
| POST | `/messages/conversation/create` | Create conversation | Yes |
| DELETE | `/messages/conversation/:conversationId` | Delete conversation | Yes |
| GET | `/messages/unread-count` | Get unread message count | Yes |

### Likes & Interactions APIs (12 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/likes/like` | Like a user | Yes |
| DELETE | `/likes/unlike/:userId` | Unlike a user | Yes |
| GET | `/likes/received` | Get received likes | Yes |
| GET | `/likes/sent` | Get sent likes | Yes |
| GET | `/likes/mutual` | Get mutual likes | Yes |
| POST | `/saved/save/:userId` | Save profile | Yes |
| DELETE | `/saved/unsave/:userId` | Unsave profile | Yes |
| GET | `/saved/list` | Get saved profiles | Yes |
| POST | `/blocks/block` | Block user | Yes |
| DELETE | `/blocks/unblock/:userId` | Unblock user | Yes |
| GET | `/blocks/list` | Get blocked users | Yes |
| POST | `/reports/report` | Report user | Yes |

### Payment APIs (6 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payment/initialize` | Initialize payment | Yes |
| GET | `/payment/verify/:reference` | Verify payment | Yes |
| GET | `/payment/transactions` | Get user transactions | Yes |
| GET | `/payment/wallet` | Get wallet balance | Yes |
| POST | `/payment/google-play/verify` | Verify Google Play purchase | Yes |
| POST | `/payment/webhook` | Payment webhook (Paystack/PayPal) | No |

### Notification APIs (5 endpoints)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | Get all notifications | Yes |
| PUT | `/notifications/:id/read` | Mark notification as read | Yes |
| PUT | `/notifications/read-all` | Mark all as read | Yes |
| DELETE | `/notifications/:id` | Delete notification | Yes |
| PUT | `/notifications/settings` | Update notification settings | Yes |

### Admin APIs (20+ endpoints)

**Dashboard:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/dashboard/metrics` | Get dashboard metrics | Admin |
| GET | `/admin/dashboard/charts` | Get chart data | Admin |

**Users:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/users` | List all users | Admin |
| GET | `/admin/users/:id` | Get user details | Admin |
| PUT | `/admin/users/:id` | Update user | Admin |
| DELETE | `/admin/users/:id` | Delete user | Admin |
| POST | `/admin/users/:id/suspend` | Suspend user | Admin |
| POST | `/admin/users/:id/ban` | Ban user | Admin |
| POST | `/admin/users/:id/activate` | Activate user | Admin |

**Reports:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/reports` | List all reports | Admin |
| GET | `/admin/reports/:id` | Get report details | Admin |
| PUT | `/admin/reports/:id/resolve` | Resolve report | Admin |

**Verifications:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/verifications` | List verification requests | Admin |
| PUT | `/admin/verifications/:id/approve` | Approve verification | Admin |
| PUT | `/admin/verifications/:id/reject` | Reject verification | Admin |

**Transactions:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/transactions` | List all transactions | Admin |
| POST | `/admin/transactions/:id/refund` | Refund transaction | Admin |

**Analytics:**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/analytics/users` | User analytics | Admin |
| GET | `/admin/analytics/revenue` | Revenue analytics | Admin |
| GET | `/admin/analytics/retention` | Retention analytics | Admin |

---

## Admin Dashboard

### Dashboard Pages

1. **Overview Dashboard**
   - Total users, active users, premium users
   - Revenue metrics
   - Recent activity
   - Charts (user growth, revenue, engagement)

2. **User Management**
   - User list with search/filter
   - User details view
   - Ban/suspend/activate actions
   - User activity logs

3. **Reports Management**
   - Pending reports list
   - Report details with evidence
   - Resolve/dismiss actions
   - Reporter/reported user profiles

4. **Verification Requests**
   - Pending verifications
   - Document review interface
   - Approve/reject with notes

5. **Transaction Management**
   - All transactions list
   - Filter by status/method
   - Refund functionality
   - Revenue reports

6. **Analytics & Reports**
   - User growth charts
   - Revenue analytics
   - Engagement metrics
   - Retention analysis
   - Export functionality

7. **Settings**
   - Admin user management
   - System configuration
   - Email templates
   - Notification settings

---

## Remote Development Workflow

### VS Code Remote SSH Setup

**1. Install VS Code Extension:**
```
- Remote - SSH (Microsoft)
```

**2. Configure SSH Connection:**

On your Windows machine, edit `C:\Users\Joeey\.ssh\config`:
```
Host contabo-rtm
    HostName your-vps-ip-address
    User joeey
    Port 22
    IdentityFile C:\Users\Joeey\.ssh\id_rsa
```

**3. Connect to VPS:**
```
1. Open VS Code
2. Press F1 → "Remote-SSH: Connect to Host"
3. Select "contabo-rtm"
4. Open folder: /home/joeey/rtmadmin.e-clicks.net
```

**4. Development Workflow:**
```
1. Edit files directly on VPS via VS Code
2. Terminal runs on VPS (integrated terminal)
3. Install extensions on remote (ESLint, Prettier, Prisma)
4. Git commits from VPS
5. Test backend: http://your-vps-ip:4000
6. Test admin: http://your-vps-ip:3000
```

### Git Workflow

**1. Initialize Repository on VPS:**
```bash
cd /home/joeey/rtmadmin.e-clicks.net
git init
git remote add origin https://github.com/yourusername/rtm-unified.git
```

**2. Development Cycle:**
```bash
# Make changes via VS Code Remote
git add .
git commit -m "feat: add authentication endpoints"
git push origin main
```

**3. Deployment:**
```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart rtm-backend

# Admin
cd ../admin
npm install
npm run build
pm2 restart rtm-admin
```

---

## Deployment Strategy

### Phase 1: VPS Infrastructure Setup (Week 1)

**1. Install Dependencies:**
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 15 + PostGIS
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-15 postgresql-15-postgis-3 -y

# Nginx
sudo apt install nginx -y

# PM2
sudo npm install -g pm2

# Git
sudo apt install git -y
```

**2. Configure PostgreSQL:**
```bash
sudo -u postgres psql

CREATE DATABASE rtm_production;
CREATE USER rtmuser WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE rtm_production TO rtmuser;
\c rtm_production
CREATE EXTENSION postgis;
\q
```

**3. Configure Firewall:**
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Phase 2: Backend Setup (Week 2-12)

**1. Initialize Backend:**
```bash
cd /home/joeey/rtmadmin.e-clicks.net
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express @prisma/client bcryptjs jsonwebtoken cors dotenv socket.io zod winston multer cloudinary nodemailer twilio firebase-admin paystack @paypal/checkout-server-sdk

npm install -D typescript @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors @types/multer @types/nodemailer ts-node nodemon prisma

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

**2. Create Environment File:**
```bash
nano .env
```

```env
# Database
DATABASE_URL="postgresql://rtmuser:your-secure-password@localhost:5432/rtm_production"

# JWT
JWT_SECRET="your-production-jwt-secret-change-this"
JWT_REFRESH_SECRET="your-production-refresh-secret"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
NODE_ENV="production"
PORT=4000
API_URL="https://rtmadmin.e-clicks.net/api"
ADMIN_URL="https://rtmadmin.e-clicks.net"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# Twilio
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Paystack
PAYSTACK_SECRET_KEY="sk_live_xxx"
PAYSTACK_PUBLIC_KEY="pk_live_xxx"

# PayPal
PAYPAL_CLIENT_ID="your-client-id"
PAYPAL_CLIENT_SECRET="your-client-secret"
PAYPAL_MODE="live"

# Firebase
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"
```

**3. Setup Prisma Schema:**
```bash
# Copy the complete schema from above into prisma/schema.prisma

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init
```

**4. Build and Start:**
```bash
# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/server.js --name rtm-backend
pm2 save
pm2 startup
```

### Phase 3: Admin Dashboard Setup (Week 13)

**1. Initialize Next.js:**
```bash
cd /home/joeey/rtmadmin.e-clicks.net
npx create-next-app@latest admin --typescript --tailwind --app --no-src-dir
cd admin
```

**2. Install Dependencies:**
```bash
npm install @tanstack/react-query zustand axios react-hook-form zod @hookform/resolvers recharts lucide-react
npx shadcn-ui@latest init
```

**3. Configure Environment:**
```bash
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://rtmadmin.e-clicks.net/api
```

**4. Build and Start:**
```bash
npm run build
pm2 start npm --name rtm-admin -- start
pm2 save
```

### Phase 4: Nginx Configuration

**1. Create Nginx Config:**
```bash
sudo nano /etc/nginx/sites-available/rtmadmin
```

```nginx
server {
    listen 80;
    server_name rtmadmin.e-clicks.net;

    # Admin Dashboard (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**2. Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/rtmadmin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Phase 5: SSL Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d rtmadmin.e-clicks.net

# Auto-renewal is configured automatically
```

---

## Implementation Timeline

### Week 1: Infrastructure Setup ✅ COMPLETE
- [x] VPS access confirmed
- [x] Install Node.js, PostgreSQL, Apache, PM2
- [x] Configure PostgreSQL database with PostGIS
- [x] Set up VS Code Remote SSH
- [x] Initialize project structure
- [x] SSL/HTTPS with Let's Encrypt

### Week 2-3: Authentication & Profiles ✅ COMPLETE
- [x] Implement authentication endpoints (JWT)
- [x] Create profile management APIs
- [x] Photo upload with Cloudinary
- [x] Match preferences APIs
- [x] All user management endpoints

### Week 4-5: Matching System ✅ COMPLETE
- [x] Implement matching algorithm
- [x] Geolocation search (PostGIS)
- [x] Filtering and compatibility
- [x] Explore/nearby endpoints
- [x] Likes and interactions

### Week 6-7: Messaging ✅ COMPLETE
- [x] Socket.io setup
- [x] Real-time messaging infrastructure
- [x] Conversation management
- [x] Message endpoints ready

### Week 8-9: Payments & Premium ✅ COMPLETE
- [x] Paystack integration structure
- [x] PayPal integration structure
- [x] Google Play billing structure
- [x] Premium subscription logic
- [x] Diamond purchase system
- [x] Transaction tracking

### Week 10-11: Notifications & Advanced Features ⚠️ PARTIAL
- [x] Firebase Cloud Messaging structure
- [ ] Email notifications (Nodemailer) - ready, not configured
- [ ] SMS notifications (Twilio) - ready, not configured
- [ ] Push notification system - ready, not configured
- [x] Verification system endpoints

### Week 12: Admin Dashboard ✅ COMPLETE
- [x] Next.js setup with TypeScript
- [x] Authentication system
- [x] Dashboard overview with analytics
- [x] User management (search, filter, ban, delete)
- [x] Reports & verifications
- [x] Transactions tracking
- [x] Analytics page
- [x] Beautiful responsive UI

### Week 13: Testing & Polish 🔄 IN PROGRESS
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Bug fixes
- [ ] Documentation

### Week 14: Production Launch 🎯 READY
- [x] Backend deployment
- [x] SSL configuration
- [ ] Backup automation
- [ ] Monitoring setup (basic PM2)
- [ ] Mobile app integration
- [ ] Mobile app submission

---

## CURRENT STATUS (January 23, 2026)

### ✅ COMPLETED (95%)
- Backend API: 100% (60+ endpoints)
- Admin Dashboard: 100% (7 pages complete)
  - Dashboard (Analytics & Overview)
  - Users Management
  - Reports Review
  - Photo Verifications
  - Transactions
  - Analytics & Reports
  - Settings (Admin Users, System Config, Email Templates, Notifications)
- Infrastructure: 100% (VPS, SSL, PM2)
- Database: 100% (PostgreSQL + PostGIS)

### 🔄 IN PROGRESS (5%)
- **Mobile app integration** - Flutter integration guide created
- Email/SMS notifications configuration
- Production monitoring setup
- Automated backups

### 📱 NEXT IMMEDIATE STEP
**Flutter App Integration** - See `FLUTTER_INTEGRATION.md` for complete guide
- Start with Authentication (login/register)
- Then Profile Management
- Then Matching System
- Then Messaging
- Finally Payments & Notifications

---

## Next Immediate Steps

### Step 1: VPS Infrastructure (This Week)

**Connect to VPS and install dependencies:**
```bash
ssh joeey@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15 + PostGIS
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-15 postgresql-15-postgis-3 -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2

# Verify installations
node --version
npm --version
psql --version
nginx -v
pm2 --version
```

### Step 2: Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres psql

CREATE DATABASE rtm_production;
CREATE USER rtmuser WITH ENCRYPTED PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE rtm_production TO rtmuser;
\c rtm_production
CREATE EXTENSION postgis;
\q

# Test connection
psql -U rtmuser -d rtm_production -h localhost
```

### Step 3: Initialize Backend Project

```bash
cd /home/joeey/rtmadmin.e-clicks.net
mkdir backend
cd backend

npm init -y

# Install all dependencies
npm install express @prisma/client bcryptjs jsonwebtoken cors dotenv socket.io zod winston multer cloudinary nodemailer twilio firebase-admin paystack @paypal/checkout-server-sdk express-rate-limit helmet

npm install -D typescript @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors @types/multer @types/nodemailer ts-node nodemon prisma

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

### Step 4: Set Up VS Code Remote SSH

**On Windows:**
1. Install "Remote - SSH" extension in VS Code
2. Press F1 → "Remote-SSH: Connect to Host"
3. Enter: `joeey@your-vps-ip`
4. Open folder: `/home/joeey/rtmadmin.e-clicks.net`
5. Start coding!

---

## Summary

**Unified Architecture:**
- ✅ Single directory: `/home/joeey/rtmadmin.e-clicks.net/`
- ✅ Single subdomain: `rtmadmin.e-clicks.net`
- ✅ Backend API at `/api/*`
- ✅ Admin dashboard at `/`
- ✅ Remote development via VS Code SSH
- ✅ All infrastructure on Contabo VPS

**Ready to Start:**
1. Install VPS dependencies
2. Set up PostgreSQL
3. Initialize backend project
4. Connect via VS Code Remote SSH
5. Start building APIs

---

**Let's build this! 🚀**
