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
