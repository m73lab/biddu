import { useTranslations } from "next-intl";
import { ROLE_COLORS, ROLE_OPTIONS } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ScoreBadge } from "@/components/common/ScoreBadge";

interface MemberCardProps {
  member: {
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
  };
  currentUserId: string;
  isAdmin: boolean;
  isLoading: boolean;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string, memberName: string) => void;
  onBan: (memberId: string, memberName: string, userId: string) => void;
}

export function MemberCard({
  member,
  currentUserId,
  isAdmin,
  isLoading,
  onRoleChange,
  onRemove,
  onBan,
}: MemberCardProps) {
  const t = useTranslations("member");
  const tRoles = useTranslations("auction.roles");
  const { formatShortDate } = useFormatters();
  const isCurrentUser = member.user.id === currentUserId;
  const canModify = isAdmin && !isCurrentUser && member.role !== "OWNER";
  const isNewAccount =
    !!member.user.createdAt &&
    Date.now() - new Date(member.user.createdAt).getTime() <
      7 * 24 * 60 * 60 * 1000;

  const getRoleLabel = (role: string) => {
    const roleKey = role.toLowerCase();
    if (["admin", "creator", "bidder", "owner", "pending"].includes(roleKey)) {
      return tRoles(roleKey === "owner" ? "admin" : roleKey);
    }
    return role;
  };

  return (
    <div
      className={`p-3 rounded-lg ${
        isCurrentUser ? "bg-base-200" : "bg-base-100 border border-base-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={member.user.name}
            email={member.user.email}
            size="md"
          />
          <div>
            <div className="font-bold text-sm">
              {member.user.name || t("noName")}
              {isCurrentUser && (
                <span className="badge badge-xs ml-2">{t("you")}</span>
              )}
              {isNewAccount && (
                <span className="badge badge-warning badge-xs ml-2">
                  {t("newAccount")}
                </span>
              )}
            </div>
            <div className="text-xs text-base-content/60 break-all">
              {member.user.email}
            </div>
            <div className="mt-1">
              <ScoreBadge
                avgSeller={member.user.avgSellerRating}
                sellerCount={member.user.sellerRatingCount}
                avgBuyer={member.user.avgBuyerRating}
                buyerCount={member.user.buyerRatingCount}
              />
            </div>
          </div>
        </div>
        {canModify && isAdmin && (
          <div className="flex gap-1">
            <button
              onClick={() =>
                onBan(
                  member.id,
                  member.user.name || member.user.email,
                  member.user.id,
                )
              }
              disabled={isLoading}
              className="btn btn-ghost btn-xs text-warning"
              title={t("ban")}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <span className="icon-[tabler--ban] size-4"></span>
              )}
            </button>
            <button
              onClick={() =>
                onRemove(member.id, member.user.name || member.user.email)
              }
              disabled={isLoading}
              className="btn btn-ghost btn-xs text-error"
              title={t("remove")}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <span className="icon-[tabler--trash] size-4"></span>
              )}
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {canModify ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value)}
            disabled={isLoading}
            className="select select-bordered select-xs"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`badge badge-sm ${ROLE_COLORS[member.role] || "badge-ghost"}`}
          >
            {getRoleLabel(member.role)}
          </span>
        )}
        <span className="text-xs text-base-content/60">
          {t("joined")} {formatShortDate(member.joinedAt)}
        </span>
      </div>
    </div>
  );
}
