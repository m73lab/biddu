/**
 * Seller/host public identity.
 *
 * BiddÃº is used both by people and by small stores/merchants. A store that
 * hosts auctions can set `storeName`, which replaces the personal name ONLY in
 * seller/host surfaces (auction host, item lister, winner contact, exports) â€”
 * never where the user acts as a bidder/participant (bid history, chat,
 * members, ratings), where the anonymity setting also applies.
 */
export interface SellerIdentity {
  name?: string | null;
  storeName?: string | null;
}

/** Store name when set, otherwise the personal name. */
export function sellerName(
  user: SellerIdentity | null | undefined,
): string | null {
  if (!user) return null;
  return user.storeName || user.name || null;
}
