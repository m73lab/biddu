import { createHandler } from "@/lib/api";
import { withCronSecret, runAuctionEnd } from "@/lib/api/handlers/cron.handlers";

export default createHandler({
  GET: [[withCronSecret], runAuctionEnd],
  POST: [[withCronSecret], runAuctionEnd],
});
