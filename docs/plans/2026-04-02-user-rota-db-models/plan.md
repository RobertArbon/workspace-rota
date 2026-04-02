# Rota DB Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Prisma/Postgres schema and typed query functions for the workspace-rota domain (locations, users, rota plans, rota days, and peer-to-peer day swaps).

**Architecture:** Prisma v6 schema with a generated TypeScript client at `generated/prisma`. Query logic is split into four focused modules under `src/lib/db/` (locations, users, rota, swaps). All DB interactions are integration-tested against a real Postgres test database using Vitest.

**Tech Stack:** Prisma v6 (`prisma` CLI + `@prisma/client`), PostgreSQL, Vitest (node environment, separate config), pnpm.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `prisma/schema.prisma` | All Prisma models, enums, relations |
| Create | `.env` | Dev database URL (gitignored) |
| Create | `.env.test` | Test database URL (gitignored) |
| Create | `.env.test.example` | Template for `.env.test` |
| Create | `vitest.config.db.ts` | Node-env vitest config for DB integration tests |
| Modify | `package.json` | Add `test:db` script |
| Create | `src/lib/db/client.ts` | Prisma client singleton |
| Create | `src/lib/db/locations.ts` | Location and Desk query functions |
| Create | `src/lib/db/users.ts` | User query functions |
| Create | `src/lib/db/rota.ts` | RotaPlan and RotaDay query functions |
| Create | `src/lib/db/swaps.ts` | SwapRequest, SwapAcceptance, StandaloneOffer query functions |
| Create | `src/lib/db/__tests__/setup.ts` | `cleanDb` + seed helpers shared by all DB tests |
| Create | `src/lib/db/__tests__/locations.test.ts` | Integration tests for locations.ts |
| Create | `src/lib/db/__tests__/users.test.ts` | Integration tests for users.ts |
| Create | `src/lib/db/__tests__/rota.test.ts` | Integration tests for rota.ts |
| Create | `src/lib/db/__tests__/swaps.test.ts` | Integration tests for swaps.ts |

---

## Task 1: Install Prisma packages and configure environment

**Files:**
- Modify: `package.json`
- Modify: `prisma/schema.prisma`
- Create: `.env`
- Create: `.env.test`
- Create: `.env.test.example`
- Modify: `.gitignore`

- [ ] **Step 1: Install Prisma packages**

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

Expected output: both packages appear in `package.json`.

- [ ] **Step 2: Add DATABASE_URL to the Prisma datasource**

Open `prisma/schema.prisma`. Replace the datasource block:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 3: Create .env with your dev database URL**

Create `/.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/workspace_rota"
```

Replace the credentials and database name to match your local Postgres setup.

- [ ] **Step 4: Create .env.test with your test database URL**

Create `/.env.test`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/workspace_rota_test"
```

Use a **separate database** from dev so migrations can be reset safely during tests.

- [ ] **Step 5: Create .env.test.example as a committed template**

Create `/.env.test.example`:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/workspace_rota_test"
```

- [ ] **Step 6: Add .env.test to .gitignore**

Open `.gitignore` and add after the existing `.env` line:
```
.env.test
```

- [ ] **Step 7: Validate the schema**

```bash
pnpm exec prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma .env.test.example .gitignore package.json pnpm-lock.yaml
git commit -m "chore: install prisma and configure database URL"
```

---

## Task 2: Write the Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace the full content of prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Core ──────────────────────────────────────────────────────────────────────

model Location {
  id      String @id @default(cuid())
  name    String
  address String
  desks   Desk[]
  users   User[]
}

model Desk {
  id         String   @id @default(cuid())
  name       String
  locationId String
  location   Location @relation(fields: [locationId], references: [id])
}

model User {
  id         String   @id @default(cuid())
  clerkId    String   @unique
  name       String
  email      String   @unique
  locationId String
  location   Location @relation(fields: [locationId], references: [id])

  rotaPlans               RotaPlan[]
  rotaDays                RotaDay[]
  swapRequestsMade        SwapRequest[]     @relation("SwapRequester")
  swapAcceptancesMade     SwapAcceptance[]  @relation("SwapAcceptor")
  standaloneOffersMade    StandaloneOffer[] @relation("StandaloneOfferer")
  standaloneOffersClaimed StandaloneOffer[] @relation("StandaloneClaimer")
}

// ── Rota ──────────────────────────────────────────────────────────────────────

model RotaPlan {
  id                 String        @id @default(cuid())
  userId             String
  user               User          @relation(fields: [userId], references: [id])
  effectiveFrom      DateTime
  effectiveUntilSoft DateTime
  effectiveUntilHard DateTime
  days               RotaPlanDay[]
}

model RotaPlanDay {
  id        String   @id @default(cuid())
  planId    String
  plan      RotaPlan @relation(fields: [planId], references: [id])
  dayOfWeek Int

  @@unique([planId, dayOfWeek])
}

enum RotaDayStatus {
  PAID
  CONTRACTED
}

model RotaDay {
  id     String         @id @default(cuid())
  userId String
  user   User           @relation(fields: [userId], references: [id])
  date   DateTime
  status RotaDayStatus?

  swapOffers           SwapOffer[]
  standaloneOffer      StandaloneOffer?
  providedInAcceptance SwapAcceptance?

  @@unique([userId, date])
}

// ── Swaps ─────────────────────────────────────────────────────────────────────

enum SwapRequestStatus {
  OPEN
  FULFILLED
  CANCELLED
}

model SwapRequest {
  id          String            @id @default(cuid())
  requesterId String
  requester   User              @relation("SwapRequester", fields: [requesterId], references: [id])
  wantedDate  DateTime
  status      SwapRequestStatus @default(OPEN)
  createdAt   DateTime          @default(now())

  offers     SwapOffer[]
  acceptance SwapAcceptance?
}

model SwapOffer {
  id            String      @id @default(cuid())
  swapRequestId String
  swapRequest   SwapRequest @relation(fields: [swapRequestId], references: [id])
  rotaDayId     String
  rotaDay       RotaDay     @relation(fields: [rotaDayId], references: [id])

  acceptance SwapAcceptance? @relation("AcceptedOffer")
}

model SwapAcceptance {
  id                String      @id @default(cuid())
  swapRequestId     String      @unique
  swapRequest       SwapRequest @relation(fields: [swapRequestId], references: [id])
  acceptorId        String
  acceptor          User        @relation("SwapAcceptor", fields: [acceptorId], references: [id])
  providedRotaDayId String      @unique
  providedRotaDay   RotaDay     @relation(fields: [providedRotaDayId], references: [id])
  acceptedOfferId   String?     @unique
  acceptedOffer     SwapOffer?  @relation("AcceptedOffer", fields: [acceptedOfferId], references: [id])
  resolvedAt        DateTime
}

// ── Standalone offers ─────────────────────────────────────────────────────────

enum StandaloneOfferStatus {
  OPEN
  CLAIMED
  CANCELLED
}

model StandaloneOffer {
  id          String                @id @default(cuid())
  offererId   String
  offerer     User                  @relation("StandaloneOfferer", fields: [offererId], references: [id])
  rotaDayId   String                @unique
  rotaDay     RotaDay               @relation(fields: [rotaDayId], references: [id])
  status      StandaloneOfferStatus @default(OPEN)
  claimedById String?
  claimedBy   User?                 @relation("StandaloneClaimer", fields: [claimedById], references: [id])
  claimedAt   DateTime?
}
```

- [ ] **Step 2: Validate the schema**

```bash
pnpm exec prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: write prisma schema for rota domain"
```

---

## Task 3: Generate client, run migration, and add test script

**Files:**
- Modify: `package.json`
- Create: `vitest.config.db.ts`

- [ ] **Step 1: Create the dev database**

In psql or your Postgres client:
```sql
CREATE DATABASE workspace_rota;
CREATE DATABASE workspace_rota_test;
```

- [ ] **Step 2: Run the dev migration**

```bash
pnpm exec prisma migrate dev --name init
```

Expected output ends with: `Your database is now in sync with your schema.`

This creates `prisma/migrations/<timestamp>_init/migration.sql`.

- [ ] **Step 3: Generate the Prisma client**

```bash
pnpm exec prisma generate
```

Expected: client generated to `generated/prisma/`.

- [ ] **Step 4: Apply the migration to the test database**

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/workspace_rota_test" pnpm exec prisma migrate deploy
```

Replace the URL with the value from your `.env.test`.

- [ ] **Step 5: Create vitest.config.db.ts**

Create `/vitest.config.db.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/db/__tests__/**/*.test.ts'],
    testTimeout: 15000,
  },
})
```

- [ ] **Step 6: Add test:db script to package.json**

Open `package.json` and add to the `scripts` block:

```json
"test:db": "vitest run --config vitest.config.db.ts"
```

- [ ] **Step 7: Commit**

```bash
git add prisma/migrations package.json vitest.config.db.ts pnpm-lock.yaml
git commit -m "feat: add prisma migration and db test config"
```

---

## Task 4: Prisma client singleton and test helpers

**Files:**
- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/__tests__/setup.ts`

- [ ] **Step 1: Create the Prisma client singleton**

Create `src/lib/db/client.ts`:

```ts
import { PrismaClient } from '../../../generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 2: Create the test setup helpers**

Create `src/lib/db/__tests__/setup.ts`:

```ts
import { prisma } from '../client'

// Delete all rows in reverse dependency order
export async function cleanDb() {
  await prisma.swapAcceptance.deleteMany()
  await prisma.standaloneOffer.deleteMany()
  await prisma.swapOffer.deleteMany()
  await prisma.swapRequest.deleteMany()
  await prisma.rotaDay.deleteMany()
  await prisma.rotaPlanDay.deleteMany()
  await prisma.rotaPlan.deleteMany()
  await prisma.desk.deleteMany()
  await prisma.user.deleteMany()
  await prisma.location.deleteMany()
}

export async function seedLocation(overrides: { name?: string; address?: string } = {}) {
  return prisma.location.create({
    data: {
      name: overrides.name ?? 'Test Location',
      address: overrides.address ?? '1 Test St',
    },
  })
}

export async function seedUser(
  locationId: string,
  overrides: { clerkId?: string; name?: string; email?: string } = {},
) {
  const rand = Math.random().toString(36).slice(2)
  return prisma.user.create({
    data: {
      clerkId: overrides.clerkId ?? `clerk_${rand}`,
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `user_${rand}@test.com`,
      locationId,
    },
  })
}

export async function seedRotaDay(
  userId: string,
  date: Date,
  status?: 'PAID' | 'CONTRACTED',
) {
  return prisma.rotaDay.create({ data: { userId, date, status } })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/client.ts src/lib/db/__tests__/setup.ts
git commit -m "feat: add prisma client singleton and test helpers"
```

---

## Task 5: Location and User queries (TDD)

**Files:**
- Create: `src/lib/db/locations.ts`
- Create: `src/lib/db/users.ts`
- Create: `src/lib/db/__tests__/locations.test.ts`
- Create: `src/lib/db/__tests__/users.test.ts`

- [ ] **Step 1: Write the failing location tests**

Create `src/lib/db/__tests__/locations.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createLocation, getLocationById, createDesk } from '../locations'
import { cleanDb, seedLocation } from './setup'
import { prisma } from '../client'

describe('locations', () => {
  beforeEach(cleanDb)
  afterAll(() => prisma.$disconnect())

  it('createLocation — persists name and address', async () => {
    const loc = await createLocation({ name: 'Central', address: '10 Main St' })
    expect(loc.id).toBeDefined()
    expect(loc.name).toBe('Central')
    expect(loc.address).toBe('10 Main St')
  })

  it('getLocationById — returns null for unknown id', async () => {
    expect(await getLocationById('nonexistent')).toBeNull()
  })

  it('getLocationById — returns the location by id', async () => {
    const created = await createLocation({ name: 'East Wing', address: '5 Park Rd' })
    const found = await getLocationById(created.id)
    expect(found?.name).toBe('East Wing')
  })

  it('createDesk — associates desk with location', async () => {
    const loc = await seedLocation()
    const desk = await createDesk({ name: 'Desk 4A', locationId: loc.id })
    expect(desk.locationId).toBe(loc.id)
    expect(desk.name).toBe('Desk 4A')
  })
})
```

- [ ] **Step 2: Write the failing user tests**

Create `src/lib/db/__tests__/users.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createUser, getUserByClerkId, getUserById } from '../users'
import { cleanDb, seedLocation } from './setup'
import { prisma } from '../client'

describe('users', () => {
  beforeEach(cleanDb)
  afterAll(() => prisma.$disconnect())

  it('createUser — persists user linked to a location', async () => {
    const loc = await seedLocation()
    const user = await createUser({
      clerkId: 'clerk_abc',
      name: 'Alice',
      email: 'alice@example.com',
      locationId: loc.id,
    })
    expect(user.clerkId).toBe('clerk_abc')
    expect(user.locationId).toBe(loc.id)
  })

  it('getUserByClerkId — returns the user', async () => {
    const loc = await seedLocation()
    await createUser({ clerkId: 'clerk_xyz', name: 'Bob', email: 'bob@test.com', locationId: loc.id })
    const found = await getUserByClerkId('clerk_xyz')
    expect(found?.name).toBe('Bob')
  })

  it('getUserByClerkId — returns null for unknown clerkId', async () => {
    expect(await getUserByClerkId('unknown')).toBeNull()
  })

  it('getUserById — returns the user by internal id', async () => {
    const loc = await seedLocation()
    const created = await createUser({
      clerkId: 'clerk_123',
      name: 'Carol',
      email: 'carol@test.com',
      locationId: loc.id,
    })
    const found = await getUserById(created.id)
    expect(found?.email).toBe('carol@test.com')
  })
})
```

- [ ] **Step 3: Run tests — expect failures (functions not defined)**

```bash
pnpm test:db
```

Expected: failures with `Cannot find module '../locations'` and `'../users'`.

- [ ] **Step 4: Implement locations.ts**

Create `src/lib/db/locations.ts`:

```ts
import { prisma } from './client'

export async function createLocation(data: { name: string; address: string }) {
  return prisma.location.create({ data })
}

export async function getLocationById(id: string) {
  return prisma.location.findUnique({ where: { id } })
}

export async function createDesk(data: { name: string; locationId: string }) {
  return prisma.desk.create({ data })
}
```

- [ ] **Step 5: Implement users.ts**

Create `src/lib/db/users.ts`:

```ts
import { prisma } from './client'

export async function createUser(data: {
  clerkId: string
  name: string
  email: string
  locationId: string
}) {
  return prisma.user.create({ data })
}

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({ where: { clerkId } })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}
```

- [ ] **Step 6: Run tests — expect all pass**

```bash
pnpm test:db
```

Expected: all location and user tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/locations.ts src/lib/db/users.ts src/lib/db/__tests__/locations.test.ts src/lib/db/__tests__/users.test.ts
git commit -m "feat: add location and user query functions"
```

---

## Task 6: RotaPlan and RotaDay queries (TDD)

**Files:**
- Create: `src/lib/db/rota.ts`
- Create: `src/lib/db/__tests__/rota.test.ts`

- [ ] **Step 1: Write the failing rota tests**

Create `src/lib/db/__tests__/rota.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createRotaPlan, getActiveRotaPlan, createRotaDay, getUserRotaDays } from '../rota'
import { cleanDb, seedLocation, seedUser } from './setup'
import { prisma } from '../client'

describe('rota', () => {
  beforeEach(cleanDb)
  afterAll(() => prisma.$disconnect())

  describe('createRotaPlan', () => {
    it('computes effectiveUntilSoft as 1 month after effectiveFrom', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      const effectiveFrom = new Date('2026-01-01T00:00:00.000Z')
      const plan = await createRotaPlan({ userId: user.id, effectiveFrom, daysOfWeek: [1] })
      expect(plan.effectiveUntilSoft).toEqual(new Date('2026-02-01T00:00:00.000Z'))
    })

    it('computes effectiveUntilHard as 1 year after effectiveFrom', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      const effectiveFrom = new Date('2026-01-01T00:00:00.000Z')
      const plan = await createRotaPlan({ userId: user.id, effectiveFrom, daysOfWeek: [1] })
      expect(plan.effectiveUntilHard).toEqual(new Date('2027-01-01T00:00:00.000Z'))
    })

    it('creates one RotaPlanDay row per day of week', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      const plan = await createRotaPlan({
        userId: user.id,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        daysOfWeek: [1, 3, 5],
      })
      expect(plan.days.map((d) => d.dayOfWeek).sort()).toEqual([1, 3, 5])
    })
  })

  describe('getActiveRotaPlan', () => {
    it('returns the most recent plan where effectiveFrom is in the past', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      await createRotaPlan({ userId: user.id, effectiveFrom: new Date('2024-01-01'), daysOfWeek: [1] })
      await createRotaPlan({ userId: user.id, effectiveFrom: new Date('2025-01-01'), daysOfWeek: [2] })
      const active = await getActiveRotaPlan(user.id)
      expect(active?.days[0].dayOfWeek).toBe(2)
    })

    it('returns null when no plan exists', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      expect(await getActiveRotaPlan(user.id)).toBeNull()
    })

    it('ignores plans with effectiveFrom in the future', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      await createRotaPlan({ userId: user.id, effectiveFrom: new Date('2099-01-01'), daysOfWeek: [3] })
      expect(await getActiveRotaPlan(user.id)).toBeNull()
    })
  })

  describe('createRotaDay', () => {
    it('creates a rota day with null status by default', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      const day = await createRotaDay({ userId: user.id, date: new Date('2030-03-10T00:00:00.000Z') })
      expect(day.status).toBeNull()
    })

    it('creates a rota day with PAID status', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      const day = await createRotaDay({
        userId: user.id,
        date: new Date('2030-03-11T00:00:00.000Z'),
        status: 'PAID',
      })
      expect(day.status).toBe('PAID')
    })
  })

  describe('getUserRotaDays', () => {
    it('returns only future rota days ordered by date ascending', async () => {
      const loc = await seedLocation()
      const user = await seedUser(loc.id)
      await createRotaDay({ userId: user.id, date: new Date('2020-01-01T00:00:00.000Z') })
      await createRotaDay({ userId: user.id, date: new Date('2030-01-02T00:00:00.000Z') })
      await createRotaDay({ userId: user.id, date: new Date('2030-01-01T00:00:00.000Z') })
      const days = await getUserRotaDays(user.id)
      expect(days).toHaveLength(2)
      expect(days[0].date).toEqual(new Date('2030-01-01T00:00:00.000Z'))
      expect(days[1].date).toEqual(new Date('2030-01-02T00:00:00.000Z'))
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pnpm test:db
```

Expected: failures with `Cannot find module '../rota'`.

- [ ] **Step 3: Implement rota.ts**

Create `src/lib/db/rota.ts`:

```ts
import { prisma } from './client'
import type { RotaDayStatus } from '../../../generated/prisma'

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

export async function createRotaPlan(data: {
  userId: string
  effectiveFrom: Date
  daysOfWeek: number[]
}) {
  return prisma.rotaPlan.create({
    data: {
      userId: data.userId,
      effectiveFrom: data.effectiveFrom,
      effectiveUntilSoft: addMonths(data.effectiveFrom, 1),
      effectiveUntilHard: addYears(data.effectiveFrom, 1),
      days: {
        create: data.daysOfWeek.map((dayOfWeek) => ({ dayOfWeek })),
      },
    },
    include: { days: true },
  })
}

export async function getActiveRotaPlan(userId: string) {
  return prisma.rotaPlan.findFirst({
    where: {
      userId,
      effectiveFrom: { lte: new Date() },
    },
    orderBy: { effectiveFrom: 'desc' },
    include: { days: true },
  })
}

export async function createRotaDay(data: {
  userId: string
  date: Date
  status?: RotaDayStatus
}) {
  return prisma.rotaDay.create({ data })
}

export async function getUserRotaDays(userId: string, from: Date = new Date()) {
  return prisma.rotaDay.findMany({
    where: {
      userId,
      date: { gte: from },
    },
    orderBy: { date: 'asc' },
  })
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
pnpm test:db
```

Expected: all rota tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/rota.ts src/lib/db/__tests__/rota.test.ts
git commit -m "feat: add rota plan and rota day query functions"
```

---

## Task 7: Swap queries — SwapRequest and SwapAcceptance (TDD)

**Files:**
- Create: `src/lib/db/swaps.ts` (partial — StandaloneOffer added in Task 8)
- Create: `src/lib/db/__tests__/swaps.test.ts` (partial)

- [ ] **Step 1: Write the failing swap request and acceptance tests**

Create `src/lib/db/__tests__/swaps.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
  createSwapRequest,
  getOpenSwapRequestsAtLocation,
  cancelSwapRequest,
  acceptSwap,
} from '../swaps'
import { cleanDb, seedLocation, seedUser, seedRotaDay } from './setup'
import { prisma } from '../client'

describe('swaps', () => {
  beforeEach(cleanDb)
  afterAll(() => prisma.$disconnect())

  describe('createSwapRequest', () => {
    it('creates an OPEN request with offered rota days', async () => {
      const loc = await seedLocation()
      const userA = await seedUser(loc.id)
      const offeredDay = await seedRotaDay(userA.id, new Date('2030-01-06T00:00:00.000Z'))
      const req = await createSwapRequest({
        requesterId: userA.id,
        wantedDate: new Date('2030-01-07T00:00:00.000Z'),
        offeredRotaDayIds: [offeredDay.id],
      })
      expect(req.status).toBe('OPEN')
      expect(req.offers).toHaveLength(1)
      expect(req.offers[0].rotaDayId).toBe(offeredDay.id)
    })

    it('creates a request with multiple offered days', async () => {
      const loc = await seedLocation()
      const userA = await seedUser(loc.id)
      const day1 = await seedRotaDay(userA.id, new Date('2030-01-06T00:00:00.000Z'))
      const day2 = await seedRotaDay(userA.id, new Date('2030-01-08T00:00:00.000Z'))
      const req = await createSwapRequest({
        requesterId: userA.id,
        wantedDate: new Date('2030-01-07T00:00:00.000Z'),
        offeredRotaDayIds: [day1.id, day2.id],
      })
      expect(req.offers).toHaveLength(2)
    })
  })

  describe('getOpenSwapRequestsAtLocation', () => {
    it('returns OPEN requests for the location with requester and offers', async () => {
      const loc = await seedLocation()
      const userA = await seedUser(loc.id)
      const day = await seedRotaDay(userA.id, new Date('2030-01-06T00:00:00.000Z'))
      await createSwapRequest({
        requesterId: userA.id,
        wantedDate: new Date('2030-01-07T00:00:00.000Z'),
        offeredRotaDayIds: [day.id],
      })
      const requests = await getOpenSwapRequestsAtLocation(loc.id)
      expect(requests).toHaveLength(1)
      expect(requests[0].requester.locationId).toBe(loc.id)
      expect(requests[0].offers).toHaveLength(1)
    })

    it('excludes CANCELLED requests', async () => {
      const loc = await seedLocation()
      const userA = await seedUser(loc.id)
      const day = await seedRotaDay(userA.id, new Date('2030-01-06T00:00:00.000Z'))
      const req = await createSwapRequest({
        requesterId: userA.id,
        wantedDate: new Date('2030-01-07T00:00:00.000Z'),
        offeredRotaDayIds: [day.id],
      })
      await cancelSwapRequest(req.id)
      expect(await getOpenSwapRequestsAtLocation(loc.id)).toHaveLength(0)
    })

    it('excludes requests from other locations', async () => {
      const loc1 = await seedLocation({ name: 'Loc 1', address: '1 Road' })
      const loc2 = await seedLocation({ name: 'Loc 2', address: '2 Road' })
      const userA = await seedUser(loc1.id)
      const userB = await seedUser(loc2.id)
      const dayA = await seedRotaDay(userA.id, new Date('2030-01-06T00:00:00.000Z'))
      const dayB = await seedRotaDay(userB.id, new Date('2030-01-08T00:00:00.000Z'))
      await createSwapRequest({
        requesterId: userA.id,
        wantedDate: new Date('2030-01-07T00:00:00.000Z'),
        offeredRotaDayIds: [dayA.id],
      })
      await createSwapRequest({
        requesterId: userB.id,
        wantedDate: new Date('2030-01-09T00:00:00.000Z'),
        offeredRotaDayIds: [dayB.id],
      })
      const results = await getOpenSwapRequestsAtLocation(loc1.id)
      expect(results).toHaveLength(1)
      expect(results[0].requester.locationId).toBe(loc1.id)
    })
  })

  describe('acceptSwap — full swap', () => {
    it('transfers both days and marks request FULFILLED', async () => {
      const loc = await seedLocation()
      const userA = await seedUser(loc.id)
      const userB = await seedUser(loc.id)
      const dayA = await seedRotaDay(userA.id, new Date('2030-01-06T00:00:00.000Z'))
      const dayB = await seedRotaDay(userB.id, new Date('2030-01-07T00:00:00.000Z'))
      const req = await createSwapRequest({
        requesterId: userA.id,
        wantedDate: new Date('2030-01-07T00:00:00.000Z'),
        offeredRotaDayIds: [dayA.id],
      })

      await acceptSwap({
        swapRequestId: req.id,
        acceptorId: userB.id,
        providedRotaDayId: dayB.id,
        acceptedOfferId: req.offers[0].id,
      })

      const [updatedDayA, updatedDayB, updatedReq] = await Promise.all([
        prisma.rotaDay.findUnique({ where: { id: dayA.id } }),
        prisma.rotaDay.findUnique({ where: { id: dayB.id } }),
        prisma.swapRequest.findUnique({ where: { id: req.id } }),
      ])

      expect(updatedDayB?.userId).toBe(userA.id) // User B's day now belongs to User A
      expect(updatedDayA?.userId).toBe(userB.id) // User A's offered day now belongs to User B
      expect(updatedReq?.status).toBe('FULFILLED')
    })
  })

  describe('acceptSwap — one-sided give', () => {
    it('transfers provided day only, leaves offered days unchanged', async () => {
      const loc = await seedLocation()
      const userA = await seedUser(loc.id)
      const userB = await seedUser(loc.id)
      const dayA = await seedRotaDay(userA.id, new Date('2030-01-06T00:00:00.000Z'))
      const dayB = await seedRotaDay(userB.id, new Date('2030-01-07T00:00:00.000Z'))
      const req = await createSwapRequest({
        requesterId: userA.id,
        wantedDate: new Date('2030-01-07T00:00:00.000Z'),
        offeredRotaDayIds: [dayA.id],
      })

      await acceptSwap({
        swapRequestId: req.id,
        acceptorId: userB.id,
        providedRotaDayId: dayB.id,
        // no acceptedOfferId
      })

      const [updatedDayA, updatedDayB] = await Promise.all([
        prisma.rotaDay.findUnique({ where: { id: dayA.id } }),
        prisma.rotaDay.findUnique({ where: { id: dayB.id } }),
      ])

      expect(updatedDayB?.userId).toBe(userA.id) // transferred
      expect(updatedDayA?.userId).toBe(userA.id) // unchanged — User A still owns it
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
pnpm test:db
```

Expected: failures with `Cannot find module '../swaps'`.

- [ ] **Step 3: Implement swaps.ts (swap request and acceptance functions only)**

Create `src/lib/db/swaps.ts`:

```ts
import { prisma } from './client'

export async function createSwapRequest(data: {
  requesterId: string
  wantedDate: Date
  offeredRotaDayIds: string[]
}) {
  return prisma.swapRequest.create({
    data: {
      requesterId: data.requesterId,
      wantedDate: data.wantedDate,
      offers: {
        create: data.offeredRotaDayIds.map((rotaDayId) => ({ rotaDayId })),
      },
    },
    include: { offers: true },
  })
}

export async function getOpenSwapRequestsAtLocation(locationId: string) {
  return prisma.swapRequest.findMany({
    where: {
      status: 'OPEN',
      requester: { locationId },
    },
    include: {
      requester: true,
      offers: { include: { rotaDay: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function cancelSwapRequest(swapRequestId: string) {
  return prisma.swapRequest.update({
    where: { id: swapRequestId },
    data: { status: 'CANCELLED' },
  })
}

export async function acceptSwap(data: {
  swapRequestId: string
  acceptorId: string
  providedRotaDayId: string
  acceptedOfferId?: string
}) {
  return prisma.$transaction(async (tx) => {
    const swapRequest = await tx.swapRequest.findUniqueOrThrow({
      where: { id: data.swapRequestId },
    })

    await tx.swapAcceptance.create({
      data: {
        swapRequestId: data.swapRequestId,
        acceptorId: data.acceptorId,
        providedRotaDayId: data.providedRotaDayId,
        acceptedOfferId: data.acceptedOfferId ?? null,
        resolvedAt: new Date(),
      },
    })

    await tx.rotaDay.update({
      where: { id: data.providedRotaDayId },
      data: { userId: swapRequest.requesterId },
    })

    if (data.acceptedOfferId) {
      const offer = await tx.swapOffer.findUniqueOrThrow({
        where: { id: data.acceptedOfferId },
      })
      await tx.rotaDay.update({
        where: { id: offer.rotaDayId },
        data: { userId: data.acceptorId },
      })
    }

    return tx.swapRequest.update({
      where: { id: data.swapRequestId },
      data: { status: 'FULFILLED' },
    })
  })
}
```

- [ ] **Step 4: Run tests — expect all swap tests pass**

```bash
pnpm test:db
```

Expected: all swap request and acceptance tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/swaps.ts src/lib/db/__tests__/swaps.test.ts
git commit -m "feat: add swap request and acceptance query functions"
```

---

## Task 8: Standalone offer queries (TDD)

**Files:**
- Modify: `src/lib/db/swaps.ts`
- Modify: `src/lib/db/__tests__/swaps.test.ts`

- [ ] **Step 1: Add failing standalone offer tests**

Append the following to `src/lib/db/__tests__/swaps.test.ts` (inside the outer `describe('swaps', ...)` block, after the existing `describe` blocks):

```ts
  describe('createStandaloneOffer', () => {
    it('creates an OPEN offer linked to a rota day', async () => {
      const loc = await seedLocation()
      const userB = await seedUser(loc.id)
      const day = await seedRotaDay(userB.id, new Date('2030-01-07T00:00:00.000Z'))
      const offer = await createStandaloneOffer({ offererId: userB.id, rotaDayId: day.id })
      expect(offer.status).toBe('OPEN')
      expect(offer.rotaDayId).toBe(day.id)
    })
  })

  describe('getOpenStandaloneOffersAtLocation', () => {
    it('returns OPEN future offers at the location', async () => {
      const loc = await seedLocation()
      const userB = await seedUser(loc.id)
      const day = await seedRotaDay(userB.id, new Date('2030-01-07T00:00:00.000Z'))
      await createStandaloneOffer({ offererId: userB.id, rotaDayId: day.id })
      const offers = await getOpenStandaloneOffersAtLocation(loc.id)
      expect(offers).toHaveLength(1)
      expect(offers[0].offerer.locationId).toBe(loc.id)
    })

    it('excludes past offers', async () => {
      const loc = await seedLocation()
      const userB = await seedUser(loc.id)
      const pastDay = await seedRotaDay(userB.id, new Date('2020-01-01T00:00:00.000Z'))
      await createStandaloneOffer({ offererId: userB.id, rotaDayId: pastDay.id })
      expect(await getOpenStandaloneOffersAtLocation(loc.id)).toHaveLength(0)
    })

    it('excludes offers from other locations', async () => {
      const loc1 = await seedLocation({ name: 'A', address: '1 Rd' })
      const loc2 = await seedLocation({ name: 'B', address: '2 Rd' })
      const userLoc1 = await seedUser(loc1.id)
      const userLoc2 = await seedUser(loc2.id)
      const day1 = await seedRotaDay(userLoc1.id, new Date('2030-01-07T00:00:00.000Z'))
      const day2 = await seedRotaDay(userLoc2.id, new Date('2030-01-08T00:00:00.000Z'))
      await createStandaloneOffer({ offererId: userLoc1.id, rotaDayId: day1.id })
      await createStandaloneOffer({ offererId: userLoc2.id, rotaDayId: day2.id })
      const offers = await getOpenStandaloneOffersAtLocation(loc1.id)
      expect(offers).toHaveLength(1)
      expect(offers[0].offerer.locationId).toBe(loc1.id)
    })
  })

  describe('claimStandaloneOffer', () => {
    it('transfers rota day to claimer and marks offer CLAIMED', async () => {
      const loc = await seedLocation()
      const userA = await seedUser(loc.id)
      const userB = await seedUser(loc.id)
      const day = await seedRotaDay(userB.id, new Date('2030-01-07T00:00:00.000Z'))
      const offer = await createStandaloneOffer({ offererId: userB.id, rotaDayId: day.id })

      await claimStandaloneOffer({ standaloneOfferId: offer.id, claimedById: userA.id })

      const [updatedDay, updatedOffer] = await Promise.all([
        prisma.rotaDay.findUnique({ where: { id: day.id } }),
        prisma.standaloneOffer.findUnique({ where: { id: offer.id } }),
      ])

      expect(updatedDay?.userId).toBe(userA.id)
      expect(updatedOffer?.status).toBe('CLAIMED')
      expect(updatedOffer?.claimedById).toBe(userA.id)
      expect(updatedOffer?.claimedAt).toBeDefined()
    })
  })
```

Also update the import at the top of `swaps.test.ts` to add the new functions:

```ts
import {
  createSwapRequest,
  getOpenSwapRequestsAtLocation,
  cancelSwapRequest,
  acceptSwap,
  createStandaloneOffer,
  getOpenStandaloneOffersAtLocation,
  claimStandaloneOffer,
} from '../swaps'
```

- [ ] **Step 2: Run tests — expect failures for standalone offer functions**

```bash
pnpm test:db
```

Expected: failures with `createStandaloneOffer is not a function`.

- [ ] **Step 3: Add standalone offer functions to swaps.ts**

Append to `src/lib/db/swaps.ts`:

```ts
export async function createStandaloneOffer(data: {
  offererId: string
  rotaDayId: string
}) {
  return prisma.standaloneOffer.create({ data })
}

export async function getOpenStandaloneOffersAtLocation(locationId: string) {
  return prisma.standaloneOffer.findMany({
    where: {
      status: 'OPEN',
      offerer: { locationId },
      rotaDay: { date: { gte: new Date() } },
    },
    include: {
      offerer: true,
      rotaDay: true,
    },
    orderBy: { rotaDay: { date: 'asc' } },
  })
}

export async function claimStandaloneOffer(data: {
  standaloneOfferId: string
  claimedById: string
}) {
  const offer = await prisma.standaloneOffer.findUniqueOrThrow({
    where: { id: data.standaloneOfferId },
    select: { rotaDayId: true },
  })

  return prisma.$transaction(async (tx) => {
    await tx.standaloneOffer.update({
      where: { id: data.standaloneOfferId },
      data: {
        status: 'CLAIMED',
        claimedById: data.claimedById,
        claimedAt: new Date(),
      },
    })

    return tx.rotaDay.update({
      where: { id: offer.rotaDayId },
      data: { userId: data.claimedById },
    })
  })
}
```

- [ ] **Step 4: Run all DB tests — expect full pass**

```bash
pnpm test:db
```

Expected: all tests across all four test files pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/swaps.ts src/lib/db/__tests__/swaps.test.ts
git commit -m "feat: add standalone offer query functions"
```
