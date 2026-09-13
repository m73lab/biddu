-- AlterTable: denormalized rating averages per user
ALTER TABLE "users" ADD COLUMN "avgSellerRating" REAL;
ALTER TABLE "users" ADD COLUMN "sellerRatingCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "avgBuyerRating" REAL;
ALTER TABLE "users" ADD COLUMN "buyerRatingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: two-way ratings
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionItemId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "rateeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ratings_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ratings_rateeId_fkey" FOREIGN KEY ("rateeId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ratings_auctionItemId_raterId_role_key" ON "ratings"("auctionItemId", "raterId", "role");
CREATE INDEX "ratings_rateeId_revealed_idx" ON "ratings"("rateeId", "revealed");
CREATE INDEX "ratings_revealed_createdAt_idx" ON "ratings"("revealed", "createdAt");

-- NOTE: RatingRole + NotificationType additions are enum-only
-- (SQLite stores enums as TEXT, no DDL needed).
