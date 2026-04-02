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
