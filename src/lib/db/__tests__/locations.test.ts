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
