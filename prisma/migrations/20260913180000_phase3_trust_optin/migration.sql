-- AlterTable: opt-in bidder approval + winner confirmation per auction
ALTER TABLE "auctions" ADD COLUMN "bidderApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "auctions" ADD COLUMN "winnerConfirmEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "auctions" ADD COLUMN "winnerConfirmHours" INTEGER NOT NULL DEFAULT 48;

-- AlterTable: winner confirmation state per item
ALTER TABLE "auction_items" ADD COLUMN "winnerConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "auction_items" ADD COLUMN "winnerConfirmDeadline" DATETIME;

-- NOTE: MemberRole.PENDING and NotificationType.SHILL_SUSPECTED are
-- enum-only additions (SQLite stores enums as TEXT, no DDL needed).
