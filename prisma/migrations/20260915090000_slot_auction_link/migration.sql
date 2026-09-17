-- Link slot redemptions to auctions (parity with cloud; dormant until slots UI exists)
--
-- REPAIR (2026-09-17): SlotCode/SlotRedemption/Product were added to
-- schema.prisma WITHOUT migrations (dev databases received them via
-- `prisma db push`), so a fresh `migrate deploy` died here with
-- "no such table: slot_redemptions". This migration never applied cleanly
-- anywhere via migrate, which is why editing it in place is safe.
-- It is now self-sufficient: it creates the missing tables (IF NOT EXISTS,
-- a no-op on dev databases) with the auctionId column already included,
-- plus their indexes. The original ALTER TABLE is superseded by the
-- CREATE below and kept as comment for history:
-- ALTER TABLE "slot_redemptions" ADD COLUMN "auctionId" TEXT REFERENCES "auctions" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slotType" TEXT NOT NULL,
    "slotAmount" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "flowUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "slot_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "productId" TEXT,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedById" TEXT,
    "redeemedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slot_codes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "slot_codes_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "slot_redemptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slotCodeId" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "auctionId" TEXT,
    "redeemedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "expiryNotified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "slot_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slot_redemptions_slotCodeId_fkey" FOREIGN KEY ("slotCodeId") REFERENCES "slot_codes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "slot_redemptions_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "slot_codes_code_key" ON "slot_codes"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "slot_redemptions_slotCodeId_key" ON "slot_redemptions"("slotCodeId");
CREATE INDEX IF NOT EXISTS "slot_redemptions_userId_expiresAt_idx" ON "slot_redemptions"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "slot_redemptions_auctionId_expiresAt_idx" ON "slot_redemptions"("auctionId", "expiresAt");
