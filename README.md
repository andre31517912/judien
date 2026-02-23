# Judien — Taiwan Event App (MVP)

A Partiful-like event RSVP app built for Taiwan.  
**Web** (Next.js) + **Mobile** (Expo React Native) sharing types from a common package, backed by a NestJS API.

---

## 1. MVP Summary

Judien lets a privileged admin create events with bilingual (EN/中文) fields, cover photos, fees, and timezone-aware dates.  
Any registered user can browse upcoming/past events, RSVP (Going/Maybe/Not Going), and leave comments.  
Admins can send one-click SMS + Email blasts to RSVP'd users and pre-configure per-event reminders that fire automatically via a BullMQ worker.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Web | Next.js 14 (App Router) | SEO + RSC + easy i18n with next-intl |
| Mobile | Expo React Native | Single codebase iOS + Android |
| API | NestJS (Node.js) | Structured DI, guards, decorators |
| DB | PostgreSQL + Prisma | Relational integrity, strong TS types |
| Queue | Redis + BullMQ | Reliable delayed jobs, retries |
| SMS | Twilio | Best Taiwan coverage + E.164 |
| Email | SendGrid | High deliverability; simple API |
| Auth | JWT (access 15 m + refresh 30 d) | httpOnly cookies on web; SecureStore RN |
| i18n | next-intl (web) / i18next (RN) | Same string dictionaries in /shared |
| Validation | Zod | Shared between API + clients |

---

## 3. Monorepo Structure

```
judien/
├── package.json            ← pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── apps/
│   ├── api/                ← NestJS backend
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── prisma/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── events/
│   │   │   ├── rsvp/
│   │   │   ├── comments/
│   │   │   ├── reminders/
│   │   │   ├── blast/
│   │   │   ├── messaging/  ← adapter layer + mock
│   │   │   ├── queue/
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   ├── guards/
│   │   │   │   └── pipes/
│   │   │   └── workers/
│   │   │       └── reminder.worker.ts
│   │   └── .env.example
│   ├── web/                ← Next.js (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── [locale]/
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── login/
│   │   │   │       ├── signup/
│   │   │   │       ├── events/
│   │   │   │       │   └── [id]/
│   │   │   │       ├── profile/
│   │   │   │       └── admin/events/
│   │   │   │           ├── new/
│   │   │   │           └── [id]/edit/
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   ├── lib/
│   │   │   └── i18n.ts
│   │   └── .env.example
│   └── mobile/             ← Expo React Native
│       ├── app/
│       │   ├── _layout.tsx
│       │   ├── (auth)/     ← login, signup
│       │   ├── (tabs)/     ← events, profile
│       │   ├── events/[id].tsx
│       │   └── admin/events/new.tsx
│       ├── context/
│       ├── lib/            ← api.ts, i18n.ts
│       └── .env.example
└── packages/
    └── shared/             ← types, Zod schemas, i18n dictionaries
        └── src/
            ├── types.ts
            ├── schemas.ts
            └── i18n/
                ├── en.ts
                ├── zh.ts
                └── index.ts
```

---

## 4. Getting Started

### Prerequisites
- pnpm 9+ (`npm install -g pnpm`)
- Node 20+
- PostgreSQL running locally (or Docker)
- Redis running locally (or Docker)

### Quick start with Docker
```bash
docker run -d --name pg -e POSTGRES_PASSWORD=password -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7
```

### Install
```bash
pnpm install
```

### Configure
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
# Edit apps/api/.env — at minimum set DATABASE_URL, JWT_SECRET
```

### Database
```bash
pnpm db:migrate       # runs prisma migrate dev (creates DB + schema)
pnpm db:studio        # opens Prisma Studio at http://localhost:5555
```

### Create first admin user
After running migrations, open Prisma Studio and set one user's `role` to `ADMIN`.
Or run:
```bash
# Inside the api directory
npx ts-node -e "
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const p=new PrismaClient();
p.user.create({data:{email:'admin@judien.tw',passwordHash:bcrypt.hashSync('password123',12),phoneE164:'+886912345678',role:'ADMIN'}}).then(console.log).finally(()=>p.\$disconnect());
"
```

### Run everything
```bash
# Terminal 1 — API
pnpm dev:api

# Terminal 2 — Web
pnpm dev:web

# Terminal 3 — BullMQ worker (for scheduled reminders)
pnpm queue:worker

# Terminal 4 — Mobile (iOS Simulator / Android Emulator)
pnpm dev:mobile
```

---

## 5. API Reference (summary)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /api/auth/signup | — | Register user |
| POST | /api/auth/login | — | Login → set cookies |
| POST | /api/auth/refresh | — | Refresh access token |
| POST | /api/auth/logout | — | Clear cookies |
| GET | /api/auth/me | JWT | Current user |
| PATCH | /api/users/me | JWT | Update profile |
| GET | /api/events?scope= | opt. JWT | List events (paginated) |
| GET | /api/events/:id | opt. JWT | Event detail + RSVP counts |
| POST | /api/events | ADMIN | Create event |
| PATCH | /api/events/:id | ADMIN | Update event |
| DELETE | /api/events/:id | ADMIN | Delete event |
| POST | /api/events/:id/rsvp | JWT | RSVP (going/maybe/no) |
| GET | /api/events/:id/comments | opt. JWT | List comments |
| POST | /api/events/:id/comments | JWT | Post comment |
| DELETE | /api/comments/:id | ADMIN | Soft-delete comment |
| GET | /api/events/:id/reminders | ADMIN | Get reminder rules |
| POST | /api/events/:id/reminders | ADMIN | Set reminder rules (schedules jobs) |
| POST | /api/events/:id/blast | ADMIN | Send SMS+Email blast |

---

## 6. i18n Strategy

**Option chosen: bilingual fields per event** (`title_en`/`title_zh`, etc.)

**Why**: Taiwan-focused events often mix languages; storing both lets each language be independently complete and makes fallback trivial. The added schema cost is minimal (6 extra text columns) and avoids ambiguity at render time.

**UI chrome**: `next-intl` on web (locale segment `/{en|zh}/…`) + `i18next` on mobile.  
Dictionaries live in `/packages/shared/src/i18n/` and are imported by both apps.

---

## 7. Messaging Architecture

```
Admin click "Send Blast"
  → POST /api/events/:id/blast
  → BlastService resolves audience (RSVP'd users)
  → For each user: MessagingService.sendEmail + sendSms
  → MessagingService logs MessageLog (PENDING → SENT/FAILED)
  → Adapter: MockAdapter (MOCK_MODE=true) logs to console
             ProductionAdapter calls Twilio / SendGrid

Admin saves ReminderRule (e.g. 1440 min before)
  → RemindersService.setForEvent
  → Calculates delay = event.startAt - 1440min - now
  → Enqueues BullMQ job with that delay, jobId = reminder:eventId:offsetMinutes (idempotent)

At fire time → reminder.worker.ts
  → Fetches event + RSVP'd non-muted users
  → Sends SMS/Email per user via adapter
  → Logs each send to MessageLog
  → BullMQ auto-retries up to 3× on failure (exponential back-off)
```

**SMS opt-out**: Users can toggle `notificationsMuted` in their profile.  
Post-MVP: Twilio inbound webhook to parse STOP replies and flip the flag automatically.

---

## 8. Security Model

- All passwords hashed with bcrypt (12 rounds)
- Access token: 15 min; Refresh token: 30 days
- Web: tokens in httpOnly+secure cookies (not accessible to JS)
- Mobile: tokens in Expo SecureStore (iOS Keychain / Android Keystore)
- Role guard enforces ADMIN-only endpoints at the NestJS layer
- Phone numbers stored in E.164; never exposed to other users
- Comments return only a redacted handle (`den***`)
- Throttle: auth + blast endpoints rate-limited (10 req/min on auth, 5/min on blast)
- CORS configured to only allow the web origin

---

## 9. What I Would Build Next (Post-MVP)

1. **Phone OTP verification** — Twilio Verify for SMS OTP on signup/login for stronger auth
2. **Real-time RSVP + comment updates** — Socket.io or Server-Sent Events so attendee counts update live
3. **Invite-only events + guest list** — Import contacts, send invite links, capacity limits
4. **Event cover photo uploads** — S3-compatible storage (AWS S3 or Cloudflare R2) with presigned URLs instead of raw URL input
5. **Analytics dashboard for admins** — RSVP trends, blast open rates (SendGrid webhooks), hourly sign-up chart
