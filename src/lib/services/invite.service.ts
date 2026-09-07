import { prisma } from "@/lib/prisma";
import { queueInviteEmail } from "@/lib/email/service";
import * as notificationService from "./notification.service";
import type { AuctionInvite } from "@/generated/prisma/client";

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
  auction: {
    id: string;
    name: string;
    description: string | null;
  };
  sender: {
    name: string | null;
    email: string;
  };
  role: string;
  email: string;
}

export interface CreateInviteInput {
  email: string;
  role?: "ADMIN" | "CREATOR" | "BIDDER";
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
 * Get invites for an auction (for invite page)
 */
export async function getAuctionInvitesForPage(
  auctionId: string,
): Promise<InviteForList[]> {
  const invites = await prisma.auctionInvite.findMany({
    where: { auctionId },
    include: {
      sender: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    token: i.token,
    usedAt: i.usedAt?.toISOString() || null,
    expiresAt: i.expiresAt?.toISOString() || null,
    createdAt: i.createdAt.toISOString(),
    sender: i.sender,
  }));
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
 * Get invite for display (public info)
 */
export async function getInviteForDisplay(
  token: string,
): Promise<InviteForDisplay | null> {
  const invite = await prisma.auctionInvite.findUnique({
    where: { token },
    include: {
      auction: {
        select: { id: true, name: true, description: true },
      },
      sender: {
        select: { name: true, email: true },
      },
    },
  });

  if (!invite) return null;

  return {
    auction: invite.auction,
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
  await prisma.$transaction([
    prisma.auctionMember.create({
      data: {
        auctionId: invite.auctionId,
        userId,
        role: invite.role,
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
