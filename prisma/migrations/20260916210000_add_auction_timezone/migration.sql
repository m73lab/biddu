-- Add timeZone to auctions (per-auction display zone, defaults to Chile)
ALTER TABLE "auctions" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Santiago';
