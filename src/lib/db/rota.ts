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
