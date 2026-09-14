-- Link slot redemptions to auctions (parity with cloud; dormant until slots UI exists)
ALTER TABLE "slot_redemptions" ADD COLUMN "auctionId" TEXT REFERENCES "auctions" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "slot_redemptions_auctionId_expiresAt_idx" ON "slot_redemptions" ("auctionId", "expiresAt");
