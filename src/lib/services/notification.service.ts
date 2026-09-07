import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/client";
import type { Notification } from "@/generated/prisma/client";
import { publish, Events, Channels } from "@/lib/realtime";
import { formatAuctionAmount } from "@/lib/currency-display";
import type {
  NotificationNewEvent,
  NotificationCountEvent,
} from "@/lib/realtime/events";

// ============================================================================
// Types
// ============================================================================

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  auctionId?: string;
  itemId?: string;
}

export interface NotificationForList {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl: string | null;
  auctionId: string | null;
  itemId: string | null;
  read: boolean;
  createdAt: string;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number },
): Promise<NotificationForList[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly && { read: false }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    imageUrl: n.imageUrl,
    auctionId: n.auctionId,
    itemId: n.itemId,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  notificationId: string,
): Promise<Notification | null> {
  return prisma.notification.findUnique({
    where: { id: notificationId },
  });
}

// ============================================================================
// Mutation Functions
// ============================================================================

/**
 * Create a notification
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      imageUrl: input.imageUrl,
      auctionId: input.auctionId,
      itemId: input.itemId,
    },
  });

  // Publish realtime event to user's private channel
  const notificationEvent: NotificationNewEvent = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    imageUrl: notification.imageUrl,
    auctionId: notification.auctionId,
    itemId: notification.itemId,
    createdAt: notification.createdAt.toISOString(),
  };
  publish(
    Channels.privateUser(input.userId),
    Events.NOTIFICATION_NEW,
    notificationEvent,
  );

  // Also publish updated unread count
  const unreadCount = await getUnreadCount(input.userId);
  const countEvent: NotificationCountEvent = { unreadCount };
  publish(
    Channels.privateUser(input.userId),
    Events.NOTIFICATION_COUNT,
    countEvent,
  );

  return notification;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
): Promise<Notification> {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return result.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

// ============================================================================
// Notification Helper Functions
// ============================================================================

/**
 * Notify user they've been outbid
 */
export async function notifyOutbid(
  previousBidderId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  newAmount: number,
  currencySymbol: string,
  normalizedAmount?: number,
): Promise<Notification> {
  const displayAmount = formatAuctionAmount(newAmount, {
    symbol: currencySymbol,
    precision: 2,
    fractionMode: "DECIMAL",
  });

  return createNotification({
    userId: previousBidderId,
    type: "OUTBID",
    title: "¡Te superaron la puja!",
    message: `Alguien ofertó ${displayAmount} por "${itemName}", superando tu puja${
      typeof normalizedAmount === "number"
        ? ` (normalizado: ${normalizedAmount})`
        : ""
    }`,
    auctionId,
    itemId,
  });
}

/**
 * Notify user they won an auction
 */
export async function notifyAuctionWon(
  winnerId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  amount: number,
  currencySymbol: string,
  normalizedAmount?: number,
): Promise<Notification> {
  const displayAmount = formatAuctionAmount(amount, {
    symbol: currencySymbol,
    precision: 2,
    fractionMode: "DECIMAL",
  });

  return createNotification({
    userId: winnerId,
    type: "AUCTION_WON",
    title: "¡Felicitaciones! ¡Ganaste!",
    message: `Ganaste "${itemName}" con una puja de ${displayAmount}${
      typeof normalizedAmount === "number"
        ? ` (normalizado: ${normalizedAmount})`
        : ""
    }`,
    auctionId,
    itemId,
  });
}

/**
 * Notify auction owner that a member joined
 */
export async function notifyMemberJoined(
  ownerId: string,
  memberName: string,
  auctionName: string,
  auctionId: string,
): Promise<Notification> {
  return createNotification({
    userId: ownerId,
    type: "MEMBER_JOINED",
    title: "Nuevo miembro",
    message: `${memberName} se unió a la subasta "${auctionName}"`,
    auctionId,
  });
}

/**
 * Notify user about a new item in an auction
 */
export async function notifyNewItem(
  userId: string,
  itemName: string,
  itemDescription: string | null,
  imageUrl: string | null,
  auctionId: string,
  itemId: string,
): Promise<Notification> {
  // Truncate description to 50 chars
  const truncatedDescription = itemDescription
    ? itemDescription.length > 50
      ? itemDescription.substring(0, 50) + "..."
      : itemDescription
    : "Sin descripción";

  return createNotification({
    userId,
    type: "NEW_ITEM",
    title: itemName,
    message: truncatedDescription,
    imageUrl: imageUrl || undefined,
    auctionId,
    itemId,
  });
}

/**
 * Notify user about a new bid on an item in an auction they're in
 */
export async function notifyNewBid(
  userId: string,
  bidderName: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  displayAmount: string,
): Promise<Notification> {
  return createNotification({
    userId,
    type: "NEW_BID",
    title: `Nueva puja en "${itemName}"`,
    message: `${bidderName} ofertó ${displayAmount} en "${itemName}"`,
    auctionId,
    itemId,
  });
}

/**
 * Notify user about a new comment on an item in an auction they're in
 */
export async function notifyNewComment(
  userId: string,
  authorName: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  snippet: string,
): Promise<Notification> {
  return createNotification({
    userId,
    type: "NEW_COMMENT",
    title: `Nuevo comentario en "${itemName}"`,
    message: `${authorName}: ${snippet}`,
    auctionId,
    itemId,
  });
}

/**
 * Notify the winner that the payment/delivery status of a won item changed.
 * Everything is settled offline - this only tracks the agreed state.
 */
export async function notifyFulfillmentUpdated(
  userId: string,
  itemName: string,
  auctionId: string,
  itemId: string,
  status: "PENDING_PAYMENT" | "PAID" | "DELIVERED",
  displayAmount: string,
): Promise<Notification> {
  const titles: Record<string, string> = {
    PENDING_PAYMENT: `Pago pendiente: "${itemName}"`,
    PAID: `Pago registrado: "${itemName}"`,
    DELIVERED: `Entrega registrada: "${itemName}"`,
  };
  const messages: Record<string, string> = {
    PENDING_PAYMENT: `El estado de "${itemName}" (${displayAmount}) volvió a pendiente de pago. Coordina el pago con el dueño del artículo.`,
    PAID: `El dueño registró el pago de "${itemName}" (${displayAmount}). Coordina la entrega.`,
    DELIVERED: `El dueño registró la entrega de "${itemName}" (${displayAmount}). ¡Que lo disfrutes!`,
  };
  return createNotification({
    userId,
    type: "FULFILLMENT_UPDATED",
    title: titles[status],
    message: messages[status],
    auctionId,
    itemId,
  });
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user owns a notification
 */
export function isNotificationOwner(
  notification: Notification,
  userId: string,
): boolean {
  return notification.userId === userId;
}
