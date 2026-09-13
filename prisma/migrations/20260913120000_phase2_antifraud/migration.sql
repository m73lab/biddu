-- AlterTable: owner-set maximum bid cap (anti-joke)
ALTER TABLE "auction_items" ADD COLUMN "maxBid" REAL;

-- AlterTable: anti-fraud audit on bids
ALTER TABLE "bids" ADD COLUMN "ipHash" TEXT;
ALTER TABLE "bids" ADD COLUMN "userAgent" TEXT;

-- CreateTable: auction bans
CREATE TABLE "auction_bans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auction_bans_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "auction_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "auction_bans_auctionId_userId_key" ON "auction_bans"("auctionId", "userId");
CREATE INDEX "auction_bans_auctionId_idx" ON "auction_bans"("auctionId");

-- CreateTable: voided winning bids (audit trail + strikes)
CREATE TABLE "bid_voids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionItemId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bid_voids_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "auction_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bid_voids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "bid_voids_userId_createdAt_idx" ON "bid_voids"("userId", "createdAt");
CREATE INDEX "bid_voids_auctionItemId_idx" ON "bid_voids"("auctionItemId");
