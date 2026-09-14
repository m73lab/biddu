import type { Placement } from "react-joyride";

export type TourId =
  | "dashboard"
  | "auction-create"
  | "item-detail"
  | "item-create";

export interface TourStepDef {
  target: string;
  titleKey: string;
  contentKey: string;
  placement?: Placement;
  /** Step is skipped silently when its target is not in the DOM. */
  optional?: boolean;
}

export const TOUR_VERSION = "v1";

export const tourSeenKey = (id: TourId) => `tour:${id}:${TOUR_VERSION}:seen`;

export const TOURS: Record<TourId, TourStepDef[]> = {
  dashboard: [
    {
      target: "body",
      titleKey: "dashboard.welcomeTitle",
      contentKey: "dashboard.welcome",
    },
    {
      target: '[data-tour="create-auction"]',
      titleKey: "dashboard.createTitle",
      contentKey: "dashboard.create",
    },
    {
      target: '[data-tour="quota-panel"]',
      titleKey: "dashboard.quotaTitle",
      contentKey: "dashboard.quota",
      optional: true,
    },
    {
      target: '[data-tour="my-auctions"]',
      titleKey: "dashboard.myAuctionsTitle",
      contentKey: "dashboard.myAuctions",
    },
    {
      target: '[data-tour="joined-auctions"]',
      titleKey: "dashboard.joinedTitle",
      contentKey: "dashboard.joined",
      optional: true,
    },
    {
      target: '[data-tour="my-bids"]',
      titleKey: "dashboard.bidsTitle",
      contentKey: "dashboard.bids",
      optional: true,
    },
  ],
  "auction-create": [
    {
      target: "body",
      titleKey: "create.welcomeTitle",
      contentKey: "create.welcome",
    },
    {
      target: '[data-tour="auction-name"]',
      titleKey: "create.nameTitle",
      contentKey: "create.name",
    },
    {
      target: '[data-tour="end-date"]',
      titleKey: "create.endDateTitle",
      contentKey: "create.endDate",
    },
    {
      target: '[data-tour="item-end-mode"]',
      titleKey: "create.itemEndModeTitle",
      contentKey: "create.itemEndMode",
    },
    {
      target: '[data-tour="submit"]',
      titleKey: "create.submitTitle",
      contentKey: "create.submit",
    },
  ],
  "item-detail": [
    {
      target: "body",
      titleKey: "item.welcomeTitle",
      contentKey: "item.welcome",
    },
    {
      target: '[data-tour="bid-form"]',
      titleKey: "item.bidTitle",
      contentKey: "item.bid",
    },
    {
      target: '[data-tour="bid-history"]',
      titleKey: "item.historyTitle",
      contentKey: "item.history",
    },
    {
      target: '[data-tour="fulfillment"]',
      titleKey: "item.fulfillmentTitle",
      contentKey: "item.fulfillment",
      optional: true,
    },
    {
      target: '[data-tour="discussions"]',
      titleKey: "item.discussionsTitle",
      contentKey: "item.discussions",
    },
  ],
  "item-create": [
    {
      target: "body",
      titleKey: "itemCreate.welcomeTitle",
      contentKey: "itemCreate.welcome",
    },
    {
      target: "#name",
      titleKey: "itemCreate.basicTitle",
      contentKey: "itemCreate.basic",
    },
    {
      target: "#currencyCode",
      titleKey: "itemCreate.currencyTitle",
      contentKey: "itemCreate.currency",
    },
    {
      target: "#startingBid",
      titleKey: "itemCreate.pricingTitle",
      contentKey: "itemCreate.pricing",
    },
    {
      target: "#maxBid",
      titleKey: "itemCreate.maxBidTitle",
      contentKey: "itemCreate.maxBid",
    },
    {
      target: "#minBidNormalized",
      titleKey: "itemCreate.normalizedTitle",
      contentKey: "itemCreate.normalized",
      optional: true,
    },
    {
      target: "#endDate",
      titleKey: "itemCreate.endDateTitle",
      contentKey: "itemCreate.endDate",
    },
    {
      target: 'input[name="bidderAnonymous"]',
      titleKey: "itemCreate.anonTitle",
      contentKey: "itemCreate.anon",
    },
    {
      target: 'input[name="discussionsEnabled"]',
      titleKey: "itemCreate.discussionsTitle",
      contentKey: "itemCreate.discussions",
    },
    {
      target: 'input[name="antiSnipeEnabled"]',
      titleKey: "itemCreate.antiSnipeTitle",
      contentKey: "itemCreate.antiSnipe",
    },
    {
      target: 'input[name="isEditableByAdmin"]',
      titleKey: "itemCreate.adminTitle",
      contentKey: "itemCreate.admin",
    },
    {
      target: '[data-tour="submit"]',
      titleKey: "itemCreate.submitTitle",
      contentKey: "itemCreate.submit",
    },
  ],
};
