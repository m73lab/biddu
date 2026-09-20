import { useTranslations } from "next-intl";
import { useState, useCallback, useEffect, useRef } from "react";
import { DiscussionForm } from "./DiscussionForm";
import { DiscussionItem } from "./DiscussionItem";
import { useItemChannel, useEvent, Events } from "@/hooks/realtime";
import type {
  DiscussionNewEvent,
  DiscussionDeletedEvent,
} from "@/lib/realtime/events";

export interface Discussion {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  parentId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    avatarSeed?: string | null;
  };
  replies: Discussion[];
}

export interface DiscussionsPaginationInfo {
  page: number;
  pageSize: number;
  totalTopLevel: number;
  totalAll: number;
  hasMore: boolean;
}

interface DiscussionSectionProps {
  auctionId: string;
  itemId: string;
  currentUserId: string;
  itemCreatorId: string;
  isOwnerOrAdmin: boolean;
  initialDiscussions: Discussion[];
  initialPagination: DiscussionsPaginationInfo;
  discussionsEnabled: boolean;
  locked?: boolean;
}

type SortOrder = "newest" | "oldest";

/** Top-level comments per page (nested replies always arrive whole). */
const PAGE_SIZE = 5;

interface DiscussionsPageResponse {
  discussions: Discussion[];
  totalTopLevel: number;
  totalAll: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function DiscussionSection({
  auctionId,
  itemId,
  currentUserId,
  itemCreatorId,
  isOwnerOrAdmin,
  initialDiscussions,
  initialPagination,
  discussionsEnabled,
  locked = false,
}: DiscussionSectionProps) {
  const t = useTranslations("discussions");
  const tErrors = useTranslations("errors");

  const [discussions, setDiscussions] =
    useState<Discussion[]>(initialDiscussions);
  const [page, setPage] = useState(initialPagination.page);
  const [totalTop, setTotalTop] = useState(initialPagination.totalTopLevel);
  const [totalAll, setTotalAll] = useState(initialPagination.totalAll);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Ids of realtime events already applied (Pusher is at-least-once).
  // Cleared on every server reload, which is the source of truth.
  const seenEvents = useRef<Set<string>>(new Set());

  const hasMore = discussions.length < totalTop;

  // Subscribe to item channel for realtime discussion updates
  const itemChannel = useItemChannel(itemId);

  // Reset state when item changes
  useEffect(() => {
    setDiscussions(initialDiscussions);
    setPage(initialPagination.page);
    setTotalTop(initialPagination.totalTopLevel);
    setTotalAll(initialPagination.totalAll);
    setSortOrder("newest");
    setReplyingTo(null);
    setEditingId(null);
    setError(null);
  }, [itemId, initialDiscussions, initialPagination]);

  // Handle realtime new discussion events - optimistically add to list
  const handleNewDiscussion = useCallback(
    (event: DiscussionNewEvent) => {
      // Don't add if it's from the current user (covered by refetch below)
      if (event.authorId === currentUserId) return;
      const key = `new:${event.discussionId}`;
      if (seenEvents.current.has(key)) return;
      seenEvents.current.add(key);

      // Totals track the server even when the item lands off-screen
      // (e.g. oldest order or a reply to an unloaded parent).
      setTotalAll((n) => n + 1);
      if (!event.parentId) setTotalTop((n) => n + 1);

      const newDiscussion: Discussion = {
        id: event.discussionId,
        content: event.content,
        createdAt: event.createdAt,
        updatedAt: event.createdAt,
        isEdited: false,
        parentId: event.parentId,
        user: {
          id: event.authorId,
          name: event.authorName,
          image: null,
          avatarSeed: event.authorAvatarSeed ?? null,
        },
        replies: [],
      };

      setDiscussions((current) => {
        // Helper to check if discussion exists anywhere in the tree
        const existsInTree = (items: Discussion[], id: string): boolean => {
          for (const item of items) {
            if (item.id === id) return true;
            if (existsInTree(item.replies, id)) return true;
          }
          return false;
        };

        // Check if already exists (dedup)
        if (existsInTree(current, event.discussionId)) return current;

        // If it's a reply, add it under the parent
        if (event.parentId) {
          const addReplyToParent = (items: Discussion[]): Discussion[] => {
            return items.map((item) => {
              if (item.id === event.parentId) {
                // Found the parent - add reply
                return {
                  ...item,
                  replies: [...item.replies, newDiscussion],
                };
              }
              // Recursively check nested replies
              return {
                ...item,
                replies: addReplyToParent(item.replies),
              };
            });
          };
          return addReplyToParent(current);
        }

        // Top-level discussion - add based on sort order.
        // With pagination, newest prepends to the visible page (later
        // loads dedupe by id); oldest belongs beyond the loaded range
        // and arrives via load-more.
        if (sortOrder === "newest") {
          return [newDiscussion, ...current];
        }
        return current;
      });
    },
    [currentUserId, sortOrder],
  );

  // Handle realtime discussion deleted events - remove from list
  const handleDiscussionDeleted = useCallback(
    (event: DiscussionDeletedEvent) => {
      const key = `del:${event.discussionId}`;
      if (seenEvents.current.has(key)) return;
      seenEvents.current.add(key);

      // wasTopLevel is best-effort: unloaded pages self-heal on next fetch.
      const wasTopLevel = discussions.some((d) => d.id === event.discussionId);
      // Helper to recursively remove discussion from tree
      const removeDiscussion = (items: Discussion[]): Discussion[] => {
        return items
          .filter((d) => d.id !== event.discussionId)
          .map((d) => ({
            ...d,
            replies: removeDiscussion(d.replies),
          }));
      };

      setDiscussions((current) => removeDiscussion(current));
      setTotalAll((n) => Math.max(0, n - 1));
      if (wasTopLevel) setTotalTop((n) => Math.max(0, n - 1));
    },
    [discussions],
  );

  // Subscribe to realtime events
  useEvent(itemChannel, Events.DISCUSSION_NEW, handleNewDiscussion);
  useEvent(itemChannel, Events.DISCUSSION_DELETED, handleDiscussionDeleted);

  const mergeUnique = (current: Discussion[], incoming: Discussion[]) => {
    if (incoming.length === 0) return current;
    const ids = new Set(current.map((d) => d.id));
    const fresh = incoming.filter((d) => !ids.has(d.id));
    return fresh.length === 0 ? current : [...current, ...fresh];
  };

  const fetchPage = useCallback(
    async (
      order: SortOrder,
      pageNum: number,
    ): Promise<DiscussionsPageResponse> => {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/discussions?order=${order}&page=${pageNum}&pageSize=${PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error("Failed to fetch discussions");
      return (await res.json()) as DiscussionsPageResponse;
    },
    [auctionId, itemId],
  );

  const applyPage = useCallback(
    (data: DiscussionsPageResponse, append: boolean) => {
      setDiscussions((current) =>
        append ? mergeUnique(current, data.discussions) : data.discussions,
      );
      setTotalTop(data.totalTopLevel);
      setTotalAll(data.totalAll);
      setPage(data.page);
    },
    [],
  );

  /** Refetch pages 1..N to keep scroll position after mutations. */
  const reloadLoaded = useCallback(
    async (order: SortOrder, upToPage: number) => {
      let acc: Discussion[] = [];
      let last: DiscussionsPageResponse | null = null;
      for (let p = 1; p <= Math.max(1, upToPage); p++) {
        const data = await fetchPage(order, p);
        acc = mergeUnique(acc, data.discussions);
        last = data;
      }
      if (last) {
        setDiscussions(acc);
        setTotalTop(last.totalTopLevel);
        setTotalAll(last.totalAll);
        setPage(last.page);
        seenEvents.current.clear();
      }
    },
    [fetchPage],
  );

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      // page/totalTop from this render; the sentinel re-subscribes
      // on every change so the closure is always fresh.
      const data = await fetchPage(sortOrder, page + 1);
      applyPage(data, true);
      seenEvents.current.clear();
    } catch {
      setError(tErrors("generic"));
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sortOrder,
    page,
    totalTop,
    discussions.length,
    fetchPage,
    applyPage,
    tErrors,
  ]);

  // Infinite scroll: auto-load the next page when the sentinel appears.
  // The "Cargar más" button below stays as fallback (and for a11y).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleSortChange = async (order: SortOrder) => {
    if (order === sortOrder) return;
    setSortOrder(order);
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchPage(order, 1);
      applyPage(data, false);
      seenEvents.current.clear();
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (content: string, parentId?: string | null) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/discussions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, parentId: parentId || null }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to post discussion");
      }

      // Refresh loaded pages to get proper tree structure
      await reloadLoaded(sortOrder, page);
      setReplyingTo(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tErrors("discussion.createFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (discussionId: string) => {
    setDeletingId(discussionId);
    setError(null);

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/discussions/${discussionId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete discussion");
      }

      // Refresh loaded pages after deletion
      await reloadLoaded(sortOrder, page);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tErrors("discussion.deleteFailed"),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (discussionId: string, content: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${itemId}/discussions/${discussionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update discussion");
      }

      // Refresh loaded pages to get updated content
      await reloadLoaded(sortOrder, page);
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tErrors("discussion.updateFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="icon-[tabler--messages] size-5"></span>
          {t("title")} ({totalAll})
        </h2>

        {discussions.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/70 whitespace-nowrap">
              {t("orderBy")}:
            </span>
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value as SortOrder)}
              className="select select-sm select-bordered"
            >
              <option value="newest">{t("newest")}</option>
              <option value="oldest">{t("oldest")}</option>
            </select>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error">
          <span className="icon-[tabler--alert-circle] size-5"></span>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <span className="icon-[tabler--x] size-4"></span>
          </button>
        </div>
      )}

      {/* New Discussion Form */}
      {locked ? (
        <div className="alert alert-info">
          <span className="icon-[tabler--message-off] size-5"></span>
          <span>{t("locked")}</span>
        </div>
      ) : discussionsEnabled ? (
        <DiscussionForm
          onSubmit={(content) => handleSubmit(content)}
          isSubmitting={isSubmitting && !replyingTo}
        />
      ) : (
        <div className="alert alert-info">
          <span className="icon-[tabler--message-off] size-5"></span>
          <span>{t("disabled")}</span>
        </div>
      )}

      {/* Discussions List */}
      {discussions.length === 0 && !loadingMore ? (
        <p className="text-base-content/60 text-center py-8">{t("empty")}</p>
      ) : (
        <>
          <div className="space-y-4">
            {discussions.map((discussion) => (
              <DiscussionItem
                key={discussion.id}
                discussion={discussion}
                currentUserId={currentUserId}
                itemCreatorId={itemCreatorId}
                isOwnerOrAdmin={isOwnerOrAdmin}
                discussionsEnabled={discussionsEnabled && !locked}
                onDelete={handleDelete}
                onReply={handleSubmit}
                onEdit={handleEdit}
                isDeleting={deletingId === discussion.id}
                editingId={editingId}
                setEditingId={setEditingId}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                isSubmitting={isSubmitting}
                depth={0}
              />
            ))}
          </div>
          {/* Pagination footer: infinite scroll sentinel + fallback button */}
          <div className="pt-2 text-center">
            <p className="text-xs text-base-content/50 mb-2">
              {t("showingOf", {
                shown: discussions.length,
                total: totalTop,
              })}
            </p>
            {loadingMore ? (
              <span
                className="loading loading-spinner loading-md text-primary"
                aria-label={t("loading")}
              />
            ) : (
              hasMore && (
                <>
                  <div ref={sentinelRef} className="h-1" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <span className="icon-[tabler--chevron-down] size-4"></span>
                    {t("loadMore")}
                  </button>
                </>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
