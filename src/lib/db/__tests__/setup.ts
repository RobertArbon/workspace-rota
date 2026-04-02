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
