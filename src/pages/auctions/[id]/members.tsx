import { useState, useEffect } from "react";
import Link from "next/link";
import * as auctionService from "@/lib/services/auction.service";
import * as memberService from "@/lib/services/member.service";
import { PageLayout, BackLink, AlertMessage, ConfirmModal } from "@/components/common";
import { MemberCard, MemberRow } from "@/components/member";
import { useToast } from "@/components/ui/toast";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";

interface Member {
  id: string;
    role: string;
      joinedAt: string;
    user: {
        id: string;
        name: string | null;
        email: string;
      createdAt: string;
      avgSellerRating: number | null;
      sellerRatingCount: number;
      avgBuyerRating: number | null;
      buyerRatingCount: number;
      };
  invitedBy: {
    name: string | null;
    email: string;
  } | null;
}

interface MembersPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
  };
  members: Member[];
  isOwner: boolean;
  isAdmin: boolean;
}

export default function MembersPage({
  user,
  auction,
  members: initialMembers,
  isOwner,
  isAdmin,
}: MembersPageProps) {
  const t = useTranslations("auction.members");
  const tCommon = useTranslations("common");
  const tAuction = useTranslations("auction");
  const tErrors = useTranslations("errors");
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [banTarget, setBanTarget] = useState<{
    memberId: string;
    userId: string;
    name: string;
  } | null>(null);
  const [bans, setBans] = useState<
    Array<{
      id: string;
      reason: string | null;
      createdAt: string;
      user: { id: string; name: string | null; email: string };
    }>
  >([]);
  const [isLoadingBans, setIsLoadingBans] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isAdmin) return;
    setIsLoadingBans(true);
    fetch(`/api/auctions/${auction.id}/members/bans`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.bans) setBans(data.bans);
      })
      .catch(() => undefined)
      .finally(() => setIsLoadingBans(false));
  }, [auction.id, isAdmin]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setError(null);
    setLoadingMemberId(memberId);

    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || tErrors("generic"));
      } else {
        setMembers(
          members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
        );
        showToast(t("updateSuccess"), "success");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setRemoveTarget({ id: memberId, name: memberName });
  };

  const performRemoveMember = async (memberId: string) => {
    setError(null);
    setLoadingMemberId(memberId);

    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || tErrors("generic"));
      } else {
        setMembers(members.filter((m) => m.id !== memberId));
        showToast(t("removeSuccess"), "success");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoadingMemberId(null);
      setRemoveTarget(null);
    }
  };

  const handleBanMember = (
    memberId: string,
    memberName: string,
    userId: string,
  ) => {
    setBanTarget({ memberId, userId, name: memberName });
  };

  const refreshBans = async () => {
    try {
      const res = await fetch(`/api/auctions/${auction.id}/members/bans`);
      if (res.ok) {
        const data = await res.json();
        if (data?.bans) setBans(data.bans);
      }
    } catch {
      // best effort
    }
  };

  const performBanMember = async () => {
    if (!banTarget) return;
    setError(null);
    setLoadingMemberId(banTarget.memberId);
    try {
      const res = await fetch(`/api/auctions/${auction.id}/members/bans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: banTarget.userId }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(result.message || tErrors("generic"));
      } else {
        setMembers(members.filter((m) => m.id !== banTarget.memberId));
        showToast(t("banSuccess"), "success");
        refreshBans();
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoadingMemberId(null);
      setBanTarget(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/members/bans?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setError(result.message || tErrors("generic"));
      } else {
        setBans(bans.filter((b) => b.user.id !== userId));
        showToast(t("unbanSuccess"), "success");
      }
    } catch {
      setError(tErrors("generic"));
    }
  };

  return (
    <PageLayout user={user} maxWidth="4xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <BackLink
            href={`/auctions/${auction.id}`}
            label={tAuction("invite.backTo", { name: auction.name })}
            shortLabel={tCommon("back")}
          />
          <h1 className="text-2xl sm:text-3xl font-bold mt-4 flex items-center gap-3">
            <span className="icon-[tabler--users] size-8 text-primary"></span>
            {t("title")}
            <span className="badge badge-neutral text-lg">
              {members.length}
            </span>
          </h1>
        </div>

        {(isOwner || isAdmin) && (
          <Link
            href={`/auctions/${auction.id}/invite`}
            className="btn btn-primary shadow-lg shadow-primary/20 gap-2"
          >
            <span className="icon-[tabler--user-plus] size-5"></span>
            {t("invite")}
          </Link>
        )}
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-0 sm:p-6">
          {error && (
            <div className="p-6 pb-0">
              <AlertMessage type="error">{error}</AlertMessage>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="sm:hidden divide-y divide-base-content/5">
            {members.map((member) => (
              <div key={member.id} className="p-4">
                <MemberCard
                    member={member}
                    currentUserId={user.id}
                    isAdmin={isAdmin}
                    isLoading={loadingMemberId === member.id}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemoveMember}
                    onBan={handleBanMember}
                  />
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table table-lg">
              <thead>
                <tr className="border-b-base-content/5">
                  <th className="bg-base-200/30 text-base-content/60 font-semibold pl-6">
                    {t("member")}
                  </th>
                  <th className="bg-base-200/30 text-base-content/60 font-semibold">
                    {t("role")}
                  </th>
                  <th className="bg-base-200/30 text-base-content/60 font-semibold">
                    {t("joined")}
                  </th>
                  <th className="bg-base-200/30 text-base-content/60 font-semibold">
                    {t("invitedBy")}
                  </th>
                  {isAdmin && (
                    <th className="bg-base-200/30 text-base-content/60 font-semibold text-right pr-6">
                      {t("actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-base-content/5">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    currentUserId={user.id}
                    isAdmin={isAdmin}
                    isLoading={loadingMemberId === member.id}
                    onRoleChange={handleRoleChange}
                    onRemove={handleRemoveMember}
                    onBan={handleBanMember}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mt-8">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <span className="icon-[tabler--ban] size-5 text-warning"></span>
              {t("bannedTitle")}
              {bans.length > 0 && (
                <span className="badge badge-warning">{bans.length}</span>
              )}
            </h2>
            {isLoadingBans ? (
              <div className="flex justify-center py-6">
                <span className="loading loading-spinner text-warning"></span>
              </div>
            ) : bans.length === 0 ? (
              <p className="text-sm text-base-content/60">
                {t("bannedEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-base-content/5">
                {bans.map((ban) => (
                  <li
                    key={ban.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {ban.user.name || ban.user.email}
                      </div>
                      <div className="text-xs text-base-content/60 truncate">
                        {ban.user.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnban(ban.user.id)}
                      className="btn btn-ghost btn-sm gap-1 shrink-0"
                    >
                      <span className="icon-[tabler--lock-open] size-4"></span>
                      {t("unban")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={removeTarget !== null}
        title={t("remove")}
        message={
          removeTarget
            ? t("confirmRemove", { name: removeTarget.name })
            : undefined
        }
        confirmLabel={t("remove")}
        cancelLabel={tCommon("cancel")}
        variant="error"
        isLoading={removeTarget ? loadingMemberId === removeTarget.id : false}
        onConfirm={() =>
          removeTarget && performRemoveMember(removeTarget.id)
        }
        onClose={() => !loadingMemberId && setRemoveTarget(null)}
      />

      <ConfirmModal
        isOpen={banTarget !== null}
        title={t("ban")}
        message={
          banTarget ? t("confirmBan", { name: banTarget.name }) : undefined
        }
        confirmLabel={t("ban")}
        cancelLabel={tCommon("cancel")}
        variant="warning"
        isLoading={banTarget ? loadingMemberId === banTarget.memberId : false}
        onConfirm={performBanMember}
        onClose={() => !loadingMemberId && setBanTarget(null)}
      />
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const auctionId = context.params?.id as string;

  const membership = await auctionService.getUserMembershipWithAuction(
    auctionId,
    context.session.user.id,
  );

  if (!membership) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const isOwner = auctionService.isOwner(membership);
  const isAdmin = auctionService.isAdmin(membership);

  // Only admins can view member list
  if (!isAdmin) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
        permanent: false,
      },
    };
  }

  const members = await memberService.getAuctionMembersForListPage(auctionId);

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      auction: {
        id: membership.auction.id,
        name: membership.auction.name,
      },
      members,
      isOwner,
      isAdmin,
      messages: await getMessages(context.locale as Locale),
    },
  };
});
