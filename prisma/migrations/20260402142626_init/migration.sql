-- CreateEnum
CREATE TYPE "RotaDayStatus" AS ENUM ('PAID', 'CONTRACTED');

-- CreateEnum
CREATE TYPE "SwapRequestStatus" AS ENUM ('OPEN', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StandaloneOfferStatus" AS ENUM ('OPEN', 'CLAIMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Desk" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "Desk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotaPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntilSoft" TIMESTAMP(3) NOT NULL,
    "effectiveUntilHard" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotaPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotaPlanDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,

    CONSTRAINT "RotaPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotaDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "RotaDayStatus",

    CONSTRAINT "RotaDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "wantedDate" TIMESTAMP(3) NOT NULL,
    "status" "SwapRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwapRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapOffer" (
    "id" TEXT NOT NULL,
    "swapRequestId" TEXT NOT NULL,
    "rotaDayId" TEXT NOT NULL,

    CONSTRAINT "SwapOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapAcceptance" (
    "id" TEXT NOT NULL,
    "swapRequestId" TEXT NOT NULL,
    "acceptorId" TEXT NOT NULL,
    "providedRotaDayId" TEXT NOT NULL,
    "acceptedOfferId" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwapAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandaloneOffer" (
    "id" TEXT NOT NULL,
    "offererId" TEXT NOT NULL,
    "rotaDayId" TEXT NOT NULL,
    "status" "StandaloneOfferStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "StandaloneOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RotaPlanDay_planId_dayOfWeek_key" ON "RotaPlanDay"("planId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "RotaDay_userId_date_key" ON "RotaDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SwapAcceptance_swapRequestId_key" ON "SwapAcceptance"("swapRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "SwapAcceptance_providedRotaDayId_key" ON "SwapAcceptance"("providedRotaDayId");

-- CreateIndex
CREATE UNIQUE INDEX "SwapAcceptance_acceptedOfferId_key" ON "SwapAcceptance"("acceptedOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "StandaloneOffer_rotaDayId_key" ON "StandaloneOffer"("rotaDayId");

-- AddForeignKey
ALTER TABLE "Desk" ADD CONSTRAINT "Desk_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaPlan" ADD CONSTRAINT "RotaPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaPlanDay" ADD CONSTRAINT "RotaPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RotaPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotaDay" ADD CONSTRAINT "RotaDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequest" ADD CONSTRAINT "SwapRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapOffer" ADD CONSTRAINT "SwapOffer_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "SwapRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapOffer" ADD CONSTRAINT "SwapOffer_rotaDayId_fkey" FOREIGN KEY ("rotaDayId") REFERENCES "RotaDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapAcceptance" ADD CONSTRAINT "SwapAcceptance_swapRequestId_fkey" FOREIGN KEY ("swapRequestId") REFERENCES "SwapRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapAcceptance" ADD CONSTRAINT "SwapAcceptance_acceptorId_fkey" FOREIGN KEY ("acceptorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapAcceptance" ADD CONSTRAINT "SwapAcceptance_providedRotaDayId_fkey" FOREIGN KEY ("providedRotaDayId") REFERENCES "RotaDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapAcceptance" ADD CONSTRAINT "SwapAcceptance_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "SwapOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandaloneOffer" ADD CONSTRAINT "StandaloneOffer_offererId_fkey" FOREIGN KEY ("offererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandaloneOffer" ADD CONSTRAINT "StandaloneOffer_rotaDayId_fkey" FOREIGN KEY ("rotaDayId") REFERENCES "RotaDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandaloneOffer" ADD CONSTRAINT "StandaloneOffer_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
