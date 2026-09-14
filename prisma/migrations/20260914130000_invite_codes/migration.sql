-- Shareable multi-use invite codes per auction
CREATE TABLE "auction_invite_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "auctionId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'BIDDER',
  "maxUses" INTEGER,
  "usesCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" DATETIME,
  "revokedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "auction_invite_codes_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "auction_invite_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "auction_invite_codes_code_key" ON "auction_invite_codes"("code");
CREATE INDEX "auction_invite_codes_auctionId_idx" ON "auction_invite_codes"("auctionId");
