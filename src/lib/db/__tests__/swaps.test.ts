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
