import type { ApiHandler } from "@/lib/api/types";
import type { ValidatedRequest } from "@/lib/api/middleware";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@/lib/api/errors";
import * as inviteService from "@/lib/services/invite.service";
import * as auctionService from "@/lib/services/auction.service";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "CREATOR", "BIDDER"]).optional(),
});

export type CreateInviteBody = z.infer<typeof createInviteSchema>;

export const createInviteCodeSchema = z.object({
  role: z.enum(["ADMIN", "CREATOR", "BIDDER"]).optional(),
  maxUses: z.number().int().min(1).max(10000).nullish(),
  expiresInDays: z.number().int().min(1).max(365).nullish(),
});

export type CreateInviteCodeBody = z.infer<typeof createInviteCodeSchema>;

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/invites/[token] - Get invite details (public)
 */
export const getInvite: ApiHandler = async (_req, res, ctx) => {
  const invite = await inviteService.getInviteByToken(ctx.params.token);

  if (!invite) {
    throw new NotFoundError("Invite not found");
  }

  const status = inviteService.validateInviteStatus(invite);
  if (!status.valid) {
    throw new BadRequestError(status.reason!);
  }

  const inviteDetails = await inviteService.getInviteForDisplay(
    ctx.params.token,
  );
  res.status(200).json(inviteDetails);
};

/**
 * POST /api/invites/[token] - Accept invite
 */
export const acceptInvite: ApiHandler = async (_req, res, ctx) => {
  const invite = await inviteService.getInviteByToken(ctx.params.token);

  if (!invite) {
    throw new NotFoundError("Invite not found");
  }

  const status = inviteService.validateInviteStatus(invite);
  if (!status.valid) {
    throw new BadRequestError(status.reason!);
  }

  const emailCheck = inviteService.validateInviteEmail(
    invite,
    ctx.session!.user.email || "",
  );
  if (!emailCheck.valid) {
    throw new ForbiddenError(emailCheck.reason!);
  }

  const result = await inviteService.acceptInvite(
    ctx.params.token,
    ctx.session!.user.id,
  );

  res.status(200).json({
    message: result.alreadyMember
      ? "Already a member"
      : "Joined auction successfully",
    auctionId: result.auctionId,
  });
};

/**
 * GET /api/auctions/[id]/invites - List auction invites
 */
export const listAuctionInvites: ApiHandler = async (_req, res, ctx) => {
  const invites = await inviteService.getAuctionInvites(ctx.params.id);
  res.status(200).json(invites);
};

/**
 * POST /api/auctions/[id]/invites - Create invite
 */
export const createAuctionInvite: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const isAdmin = ["OWNER", "ADMIN"].includes(ctx.membership!.role);

  const { validatedBody } = req as ValidatedRequest<CreateInviteBody>;

  // Check if user is already a member
  const isMember = await inviteService.checkExistingMembership(
    auctionId,
    validatedBody.email,
  );
  if (isMember) {
    throw new BadRequestError("User is already a member");
  }

  // Check for existing unused invite
  const hasInvite = await inviteService.checkExistingInvite(
    auctionId,
    validatedBody.email,
  );
  if (hasInvite) {
    throw new BadRequestError("Invite already sent to this email");
  }

  const invite = await inviteService.createInvite(
    auctionId,
    ctx.session!.user.id,
    validatedBody,
    isAdmin,
  );

  res.status(201).json(invite);
};

// ============================================================================
// Invite Codes (shareable, multi-use)
// ============================================================================

/**
 * Ensure the requester may manage invite codes for the auction
 * (admins always; other members only when memberCanInvite is on).
 * Returns whether the requester is an admin.
 */
async function assertCanManageInviteCodes(
  auctionId: string,
  userId: string,
): Promise<boolean> {
  const membership = await auctionService.getUserMembershipWithAuction(
    auctionId,
    userId,
  );
  if (!membership) {
    throw new ForbiddenError("Not a member of this auction");
  }
  const isAdmin = auctionService.isAdmin(membership);
  if (!isAdmin && !membership.auction.memberCanInvite) {
    throw new ForbiddenError("You cannot invite people to this auction");
  }
  return isAdmin;
}

/**
 * GET /api/invite-codes/[code] - Get code details (public)
 */
export const getInviteCode: ApiHandler = async (_req, res, ctx) => {
  const code = await inviteService.getInviteCodeByCode(ctx.params.code);

  if (!code) {
    throw new NotFoundError("Invite code not found");
  }

  const status = inviteService.validateInviteCodeStatus(code);
  if (!status.valid) {
    throw new BadRequestError(status.reason!);
  }

  const display = await inviteService.getInviteCodeForDisplay(ctx.params.code);
  if (!display) {
    throw new NotFoundError("Auction not found");
  }
  res.status(200).json(display);
};

/**
 * POST /api/invite-codes/[code] - Redeem code and join auction
 */
export const redeemInviteCode: ApiHandler = async (_req, res, ctx) => {
  const code = await inviteService.getInviteCodeByCode(ctx.params.code);

  if (!code) {
    throw new NotFoundError("Invite code not found");
  }

  const status = inviteService.validateInviteCodeStatus(code);
  if (!status.valid) {
    throw new BadRequestError(status.reason!);
  }

  const result = await inviteService.redeemInviteCode(
    ctx.params.code,
    ctx.session!.user.id,
  );

  res.status(200).json({
    message: result.alreadyMember
      ? "Already a member"
      : "Joined auction successfully",
    auctionId: result.auctionId,
  });
};

/**
 * GET /api/auctions/[id]/invite-codes - List auction invite codes
 */
export const listInviteCodes: ApiHandler = async (_req, res, ctx) => {
  const isAdmin = await assertCanManageInviteCodes(
    ctx.params.id,
    ctx.session!.user.id,
  );
  const codes = await inviteService.getAuctionInviteCodes(
    ctx.params.id,
    ctx.session!.user.id,
    isAdmin,
  );
  res.status(200).json(codes);
};

/**
 * POST /api/auctions/[id]/invite-codes - Create invite code
 */
export const createInviteCode: ApiHandler = async (req, res, ctx) => {
  const auctionId = ctx.params.id;
  const isAdmin = await assertCanManageInviteCodes(
    auctionId,
    ctx.session!.user.id,
  );

  const { validatedBody } = req as ValidatedRequest<CreateInviteCodeBody>;

  const code = await inviteService.createInviteCode(
    auctionId,
    ctx.session!.user.id,
    validatedBody,
    isAdmin,
  );

  res.status(201).json(code);
};

/**
 * DELETE /api/auctions/[id]/invite-codes/[codeId] - Revoke invite code
 */
export const revokeInviteCode: ApiHandler = async (_req, res, ctx) => {
  const auctionId = ctx.params.id;
  const isAdmin = await assertCanManageInviteCodes(
    auctionId,
    ctx.session!.user.id,
  );

  try {
    await inviteService.revokeInviteCode(
      ctx.params.codeId,
      auctionId,
      ctx.session!.user.id,
      isAdmin,
    );
  } catch (e) {
    throw new NotFoundError(
      e instanceof Error ? e.message : "Invite code not found",
    );
  }

  res.status(200).json({ message: "Invite code revoked" });
};

