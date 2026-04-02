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
