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
