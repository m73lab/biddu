-- Repair (2026-09-17): schema.prisma drifted from the migration history
-- (dev databases received the changes via `prisma db push`), so databases
-- built by `migrate deploy` were missing columns and carried wrong defaults,
-- and the app failed at runtime (P2022, e.g. "table main.users has no column
-- named tokenVersion"). ADD COLUMN is safe on every database built by these
-- migrations; databases built by db push already carry the columns but never
-- execute migration files.
--
-- Part 1: columns that never had a migration.
-- AlterTable
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
-- AlterTable
ALTER TABLE "users" ADD COLUMN "rut" TEXT;
-- AlterTable
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
-- AlterTable
ALTER TABLE "auction_items" ADD COLUMN "fulfillmentStatus" TEXT;

-- Part 2: column DEFAULTs changed in schema.prisma after their migrations
-- (currencyCode 'USD'->'CLP', emailOnItemWon false->true). SQLite cannot
-- ALTER a default, hence the table rebuilds below, taken verbatim from
-- `prisma migrate diff --from-migrations --to-schema --script` (which
-- already accounts for Part 1 above, so fulfillmentStatus is listed).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_auction_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'CLP',
    "startingBid" REAL NOT NULL DEFAULT 0,
    "minBidIncrement" REAL NOT NULL DEFAULT 1,
    "minBidConstraint" JSONB,
    "minBidNormalized" REAL,
    "minIncrementNormalized" REAL,
    "maxBid" REAL,
    "currentBid" REAL,
    "highestBidderId" TEXT,
    "bidderAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isEditableByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "endDate" DATETIME,
    "antiSnipeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiSnipeThresholdSeconds" INTEGER NOT NULL DEFAULT 300,
    "antiSnipeExtensionSeconds" INTEGER NOT NULL DEFAULT 300,
    "fulfillmentStatus" TEXT,
    "winnerNotified" BOOLEAN NOT NULL DEFAULT false,
    "winnerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "winnerConfirmDeadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "creatorId" TEXT NOT NULL,
    "lastUpdatedById" TEXT,
    "discussionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "auction_items_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "auction_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_items_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_auction_items" ("antiSnipeEnabled", "antiSnipeExtensionSeconds", "antiSnipeThresholdSeconds", "auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "discussionsEnabled", "endDate", "fulfillmentStatus", "highestBidderId", "id", "isEditableByAdmin", "isPublished", "lastUpdatedById", "maxBid", "minBidConstraint", "minBidIncrement", "minBidNormalized", "minIncrementNormalized", "name", "startingBid", "updatedAt", "winnerConfirmDeadline", "winnerConfirmed", "winnerNotified") SELECT "antiSnipeEnabled", "antiSnipeExtensionSeconds", "antiSnipeThresholdSeconds", "auctionId", "bidderAnonymous", "createdAt", "creatorId", "currencyCode", "currentBid", "description", "discussionsEnabled", "endDate", "fulfillmentStatus", "highestBidderId", "id", "isEditableByAdmin", "isPublished", "lastUpdatedById", "maxBid", "minBidConstraint", "minBidIncrement", "minBidNormalized", "minIncrementNormalized", "name", "startingBid", "updatedAt", "winnerConfirmDeadline", "winnerConfirmed", "winnerNotified" FROM "auction_items";
DROP TABLE "auction_items";
ALTER TABLE "new_auction_items" RENAME TO "auction_items";
CREATE TABLE "new_user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemSidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "emailOnNewItem" BOOLEAN NOT NULL DEFAULT false,
    "emailOnOutbid" BOOLEAN NOT NULL DEFAULT false,
    "emailOnItemWon" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("createdAt", "emailOnItemWon", "emailOnNewItem", "emailOnOutbid", "id", "itemSidebarCollapsed", "updatedAt", "userId") SELECT "createdAt", "emailOnItemWon", "emailOnNewItem", "emailOnOutbid", "id", "itemSidebarCollapsed", "updatedAt", "userId" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
