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
