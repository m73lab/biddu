import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { queueInviteEmail } from "@/lib/email/service";
import * as notificationService from "./notification.service";
import * as memberService from "./member.service";
import type {
  AuctionInvite,
  AuctionInviteCode,
} from "@/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface InviteWithDetails extends AuctionInvite {
  sender: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    name: string;
  };
}

export interface InviteForDisplay {
  auction: InviteAuctionForDisplay;
  sender: {
    name: string | null;
    email: string;
  };
  role: string;
  email: string;
}

/** Host (auction creator) trust info shown on the join portal. */
export interface InviteHostForDisplay {
  id: string;
  name: string | null;
  avatarSeed: string | null;
  createdAt: string;
  /** True when the account is less than 30 days old. */
  isNewAccount: boolean;
  avgSellerRating: number | null;
  sellerRatingCount: number;
  avgBuyerRating: number | null;
  buyerRatingCount: number;
}

/** Auction context shown on the join portal. */
export interface InviteAuctionForDisplay {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  endDate: string | null;
  memberCount: number;
  itemCount: number;
  host: InviteHostForDisplay | null;
}

export interface CreateInviteInput {
  email: string;
  role?: "ADMIN" | "CREATOR" | "BIDDER";
}

export interface CreateInviteCodeInput {
  role?: "ADMIN" | "CREATOR" | "BIDDER";
  /** Null/undefined = unlimited uses. */
  maxUses?: number | null;
  /** Days until expiry. Null/undefined = never expires. */
  expiresInDays?: number | null;
}

export interface InviteCodeForList {
  id: string;
  code: string;
  role: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: {
    name: string | null;
    email: string;
  };
}

export interface InviteCodeForDisplay {
  auction: InviteAuctionForDisplay;
  createdBy: {
    name: string | null;
  };
  role: string;
  code: string;
  usesCount: number;
  maxUses: number | null;
}

export interface InviteForList {
  id: string;
  email: string;
  role: string;
  token: string;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  sender: {
    name: string | null;
    email: string;
  };
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get invites for an auction (for invite page), paginated server-side.
 */
export async function getAuctionInvitesForPage(
  auctionId: string,
  opts?: { skip?: number; take?: number },
): Promise<{ invites: InviteForList[]; total: number }> {
  const skip = Math.max(0, opts?.skip ?? 0);
  const take = Math.min(100, Math.max(1, opts?.take ?? 10));

  const [total, invites] = await Promise.all([
    prisma.auctionInvite.count({ where: { auctionId } }),
    prisma.auctionInvite.findMany({
      where: { auctionId },
      include: {
        sender: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return {
    invites: invites.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      token: i.token,
      usedAt: i.usedAt?.toISOString() || null,
      expiresAt: i.expiresAt?.toISOString() || null,
      createdAt: i.createdAt.toISOString(),
      sender: i.sender,
    })),
    total,
  };
}

/**
 * Get invite by token
 */
export async function getInviteByToken(
  token: string,
): Promise<AuctionInvite | null> {
  return prisma.auctionInvite.findUnique({
    where: { token },
  });
}

/**
 * Shared auction + host context for join portals (email invites and codes).
 * Returns null when the auction no longer exists.
 */
export async function getPortalAuction(
  auctionId: string,
): Promise<InviteAuctionForDisplay | null> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      name: true,
      description: true,
      thumbnailUrl: true,
      endDate: true,
      creator: {
        select: {
          id: true,
          name: true,
          avatarSeed: true,
          createdAt: true,
          avgSellerRating: true,
          sellerRatingCount: true,
          avgBuyerRating: true,
          buyerRatingCount: true,
        },
      },
      _count: {
        select: { items: true, members: true },
      },
    },
  });

  if (!auction) return null;

  const NEW_ACCOUNT_MS = 30 * 24 * 60 * 60 * 1000;
  return {
    id: auction.id,
    name: auction.name,
    description: auction.description,
    thumbnailUrl: auction.thumbnailUrl,
    endDate: auction.endDate?.toISOString() || null,
    memberCount: auction._count.members,
    itemCount: auction._count.items,
    host: auction.creator
      ? {
          id: auction.creator.id,
          name: auction.creator.name,
          avatarSeed: auction.creator.avatarSeed,
          createdAt: auction.creator.createdAt.toISOString(),
          isNewAccount:
            Date.now() - auction.creator.createdAt.getTime() < NEW_ACCOUNT_MS,
          avgSellerRating: auction.creator.avgSellerRating,
          sellerRatingCount: auction.creator.sellerRatingCount,
          avgBuyerRating: auction.creator.avgBuyerRating,
          buyerRatingCount: auction.creator.buyerRatingCount,
        }
      : null,
  };
}

/**
 * Get invite for display (public info)
 */
export async function getInviteForDisplay(
  token: string,
): Promise<InviteForDisplay | null> {
  const invite = await prisma.auctionInvite.findUnique({
    where: { token },
    include: {
      sender: {
        select: { name: true, email: true },
      },
    },
  });

  if (!invite) return null;

  const portalAuction = await getPortalAuction(invite.auctionId);
  if (!portalAuction) return null;

  return {
    auction: portalAuction,
    sender: invite.sender,
    role: invite.role,
    email: invite.email,
  };
}

/**
 * Get all invites for an auction
 */
export async function getAuctionInvites(
  auctionId: string,
): Promise<InviteWithDetails[]> {
  return prisma.auctionInvite.findMany({
    where: { auctionId },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
      auction: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create or update an invite
 */
export async function createInvite(
  auctionId: string,
  senderId: string,
  input: CreateInviteInput,
  isAdmin: boolean,
): Promise<InviteWithDetails> {
  const email = input.email.toLowerCase();

  // Non-admins can only invite as BIDDER
  const inviteRole = isAdmin ? input.role || "BIDDER" : "BIDDER";

  const invite = await prisma.auctionInvite.upsert({
    where: {
      auctionId_email: {
        auctionId,
        email,
      },
    },
    create: {
      auctionId,
      email,
      role: inviteRole,
      senderId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    update: {
      role: inviteRole,
      senderId,
      usedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
      auction: {
        select: { name: true },
      },
    },
  });

  // Queue invite email (await to ensure it completes on serverless)
  await queueInviteEmail({
    inviteId: invite.id,
    email: invite.email,
    auctionId: invite.auctionId,
    auctionName: invite.auction.name,
    senderName: invite.sender.name || invite.sender.email,
    token: invite.token,
    role: invite.role,
  });

  // In-app notification if the invited email already belongs to a user
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const roleLabels: Record<string, string> = {
      ADMIN: "administrador",
      CREATOR: "creador",
      BIDDER: "pujador",
    };
    await notificationService
      .createNotification({
        userId: existingUser.id,
        type: "INVITE_RECEIVED",
        title: `Invitación a "${invite.auction.name}"`,
        message: `${invite.sender.name || invite.sender.email} te invitó a unirte a la subasta "${invite.auction.name}" como ${roleLabels[invite.role] || invite.role.toLowerCase()}`,
        auctionId: invite.auctionId,
      })
      .catch(() => {
        // Notification failure shouldn't break invite creation
      });
  }

  return invite;
}

/**
 * Accept an invite and create membership
 */
export async function acceptInvite(
  token: string,
  userId: string,
): Promise<{ auctionId: string; alreadyMember: boolean }> {
  const invite = await prisma.auctionInvite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new Error("Invite not found");
  }

  // Banned users cannot join, even with a valid invite
  await memberService.assertNotBanned(invite.auctionId, userId);


  // Check if already a member
  const existingMembership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId: invite.auctionId,
        userId,
      },
    },
  });

  if (existingMembership) {
    // Mark invite as used and return success
    await prisma.auctionInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    });
    return { auctionId: invite.auctionId, alreadyMember: true };
  }

  // Create membership, mark invite as used, and clear any prior leave record
  // Bidder-approval mode: BIDDER invites join as PENDING until approved
  const targetAuction = await prisma.auction.findUnique({
    where: { id: invite.auctionId },
    select: { bidderApproval: true },
  });
  const joinRole =
    targetAuction?.bidderApproval && invite.role === "BIDDER"
      ? "PENDING"
      : invite.role;
  await prisma.$transaction([
    prisma.auctionMember.create({
      data: {
        auctionId: invite.auctionId,
        userId,
        role: joinRole,
        invitedById: invite.senderId,
      },
    }),
    prisma.auctionInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
    prisma.auctionLeave.deleteMany({
      where: { auctionId: invite.auctionId, userId },
    }),
  ]);

  // Notify all auction members that someone new joined (fire and forget)
  const [auction, joiner, members] = await Promise.all([
    prisma.auction.findUnique({
      where: { id: invite.auctionId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.auctionMember.findMany({
      where: { auctionId: invite.auctionId },
      select: { userId: true },
    }),
  ]);
  const memberName = joiner?.name || joiner?.email || "Alguien";
  await Promise.all(
    members
      .filter((m) => m.userId !== userId)
      .map((o) =>
        notificationService
          .notifyMemberJoined(
            o.userId,
            memberName,
            auction?.name || "tu subasta",
            invite.auctionId,
          )
          .catch(() => {
            // Notification failure shouldn't break invite acceptance
          }),
      ),
  );

  return { auctionId: invite.auctionId, alreadyMember: false };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate invite status
 */
export function validateInviteStatus(invite: AuctionInvite): {
  valid: boolean;
  reason?: string;
} {
  if (invite.usedAt) {
    return { valid: false, reason: "Invite already used" };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { valid: false, reason: "Invite expired" };
  }

  return { valid: true };
}

/**
 * Check if user email matches invite email
 */
export function validateInviteEmail(
  invite: AuctionInvite,
  userEmail: string,
): { valid: boolean; reason?: string } {
  if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      valid: false,
      reason: `This invite is for ${invite.email}. Please login with that email.`,
    };
  }

  return { valid: true };
}

/**
 * Check if user is already a member
 */
export async function checkExistingMembership(
  auctionId: string,
  email: string,
): Promise<boolean> {
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!existingUser) return false;

  const existingMembership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: existingUser.id,
      },
    },
  });

  return !!existingMembership;
}

/**
 * Check if invite already exists and is unused
 */
export async function checkExistingInvite(
  auctionId: string,
  email: string,
): Promise<boolean> {
  const existingInvite = await prisma.auctionInvite.findUnique({
    where: {
      auctionId_email: {
        auctionId,
        email: email.toLowerCase(),
      },
    },
  });

  return !!existingInvite && !existingInvite.usedAt;
}

// ============================================================================
// Invite Codes (shareable, multi-use)
// ============================================================================

const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 6;

/** Generate a code like BID-7KQ2XA (no ambiguous chars). */
function randomInviteCode(): string {
  let suffix = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    suffix += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  }
  return `BID-${suffix}`;
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomInviteCode();
    const exists = await prisma.auctionInviteCode.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique invite code");
}

/**
 * Create a shareable invite code for an auction.
 */
export async function createInviteCode(
  auctionId: string,
  createdById: string,
  input: CreateInviteCodeInput,
  isAdmin: boolean,
): Promise<InviteCodeForList> {
  // Non-admins can only create BIDDER codes
  const role = isAdmin ? input.role || "BIDDER" : "BIDDER";
  const code = await generateUniqueInviteCode();

  const created = await prisma.auctionInviteCode.create({
    data: {
      auctionId,
      code,
      role,
      createdById,
      maxUses:
        input.maxUses === undefined || input.maxUses === null
          ? null
          : Math.floor(input.maxUses),
      expiresAt:
        input.expiresInDays === undefined || input.expiresInDays === null
          ? null
          : new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000),
    },
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
  });

  return {
    id: created.id,
    code: created.code,
    role: created.role,
    maxUses: created.maxUses,
    usesCount: created.usesCount,
    expiresAt: created.expiresAt?.toISOString() || null,
    revokedAt: null,
    createdAt: created.createdAt.toISOString(),
    createdBy: created.createdBy,
  };
}

/**
 * List invite codes for an auction. Admins see all; other inviters
 * only see the codes they created.
 */
export async function getAuctionInviteCodes(
  auctionId: string,
  requesterId: string,
  isAdmin: boolean,
): Promise<InviteCodeForList[]> {
  const codes = await prisma.auctionInviteCode.findMany({
    where: isAdmin ? { auctionId } : { auctionId, createdById: requesterId },
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return codes.map((c) => ({
    id: c.id,
    code: c.code,
    role: c.role,
    maxUses: c.maxUses,
    usesCount: c.usesCount,
    expiresAt: c.expiresAt?.toISOString() || null,
    revokedAt: c.revokedAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    createdBy: c.createdBy,
  }));
}

/**
 * Revoke an invite code (it can no longer be redeemed).
 * Admins may revoke any code; other users only their own.
 */
export async function revokeInviteCode(
  codeId: string,
  auctionId: string,
  requesterId: string,
  isAdmin: boolean,
): Promise<void> {
  const code = await prisma.auctionInviteCode.findFirst({
    where: { id: codeId, auctionId },
  });
  if (!code) {
    throw new Error("Invite code not found");
  }
  if (!isAdmin && code.createdById !== requesterId) {
    throw new Error("Not allowed to revoke this invite code");
  }
  await prisma.auctionInviteCode.update({
    where: { id: codeId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Get invite code by code (normalized: trimmed + uppercased).
 */
export async function getInviteCodeByCode(
  rawCode: string,
): Promise<AuctionInviteCode | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  return prisma.auctionInviteCode.findUnique({
    where: { code },
  });
}

/**
 * Get invite code for display (public info for the join portal).
 */
export async function getInviteCodeForDisplay(
  rawCode: string,
): Promise<InviteCodeForDisplay | null> {
  const inviteCode = await getInviteCodeByCode(rawCode);
  if (!inviteCode) return null;

  const [portalAuction, createdBy] = await Promise.all([
    getPortalAuction(inviteCode.auctionId),
    prisma.user.findUnique({
      where: { id: inviteCode.createdById },
      select: { name: true },
    }),
  ]);
  if (!portalAuction) return null;

  return {
    auction: portalAuction,
    createdBy: { name: createdBy?.name || null },
    role: inviteCode.role,
    code: inviteCode.code,
    usesCount: inviteCode.usesCount,
    maxUses: inviteCode.maxUses,
  };
}

/**
 * Validate invite code status (revoked / expired / max uses reached).
 */
export function validateInviteCodeStatus(code: AuctionInviteCode): {
  valid: boolean;
  reason?: string;
} {
  if (code.revokedAt) {
    return { valid: false, reason: "Invite code revoked" };
  }

  if (code.expiresAt && code.expiresAt < new Date()) {
    return { valid: false, reason: "Invite code expired" };
  }

  if (code.maxUses !== null && code.usesCount >= code.maxUses) {
    return { valid: false, reason: "Invite code has reached its use limit" };
  }

  return { valid: true };
}

/**
 * Redeem an invite code and create membership.
 */
export async function redeemInviteCode(
  rawCode: string,
  userId: string,
): Promise<{ auctionId: string; alreadyMember: boolean }> {
  const inviteCode = await getInviteCodeByCode(rawCode);
  if (!inviteCode) {
    throw new Error("Invite code not found");
  }

  const status = validateInviteCodeStatus(inviteCode);
  if (!status.valid) {
    throw new Error(status.reason);
  }

  // Banned users cannot join, even with a valid code
  await memberService.assertNotBanned(inviteCode.auctionId, userId);

  // Check if already a member (re-joining with a code doesn't consume a use)
  const existingMembership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId: inviteCode.auctionId,
        userId,
      },
    },
  });
  if (existingMembership) {
    return { auctionId: inviteCode.auctionId, alreadyMember: true };
  }

  // Create membership, consume one use, and clear any prior leave record
  // Bidder-approval mode: BIDDER codes join as PENDING until approved
  const targetAuction = await prisma.auction.findUnique({
    where: { id: inviteCode.auctionId },
    select: { bidderApproval: true },
  });
  const joinRole =
    targetAuction?.bidderApproval && inviteCode.role === "BIDDER"
      ? "PENDING"
      : inviteCode.role;
  await prisma.$transaction([
    prisma.auctionMember.create({
      data: {
        auctionId: inviteCode.auctionId,
        userId,
        role: joinRole,
        invitedById: inviteCode.createdById,
      },
    }),
    prisma.auctionInviteCode.update({
      where: { id: inviteCode.id },
      data: { usesCount: { increment: 1 } },
    }),
    prisma.auctionLeave.deleteMany({
      where: { auctionId: inviteCode.auctionId, userId },
    }),
  ]);

  // Notify all auction members that someone new joined (fire and forget)
  const [auction, joiner, members] = await Promise.all([
    prisma.auction.findUnique({
      where: { id: inviteCode.auctionId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.auctionMember.findMany({
      where: { auctionId: inviteCode.auctionId },
      select: { userId: true },
    }),
  ]);
  const memberName = joiner?.name || joiner?.email || "Alguien";
  await Promise.all(
    members
      .filter((m) => m.userId !== userId)
      .map((o) =>
        notificationService
          .notifyMemberJoined(
            o.userId,
            memberName,
            auction?.name || "tu subasta",
            inviteCode.auctionId,
          )
          .catch(() => {
            // Notification failure shouldn't break code redemption
          }),
      ),
  );

  return { auctionId: inviteCode.auctionId, alreadyMember: false };
}
