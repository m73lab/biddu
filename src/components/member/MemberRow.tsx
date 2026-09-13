import { useTranslations } from "next-intl";
import { ROLE_COLORS, ROLE_OPTIONS } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ScoreBadge } from "@/components/common/ScoreBadge";

interface MemberRowProps {
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
    invitedBy: {
      name: string | null;
      email: string;
    } | null;
  };
  currentUserId: string;
  isAdmin: boolean;
  isLoading: boolean;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string, memberName: string) => void;
  onBan: (memberId: string, memberName: string, userId: string) => void;
}

export function MemberRow({
  member,
  currentUserId,
  isAdmin,
  isLoading,
  onRoleChange,
  onRemove,
  onBan,
}: MemberRowProps) {
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
    <tr className={isCurrentUser ? "bg-base-200" : ""}>
      <td>
        <div className="flex items-center gap-3">
            <UserAvatar
              name={member.user.name}
              email={member.user.email}
              seed={member.user.id}
              size="md"
            />
          <div>
            <div className="font-bold">
              {member.user.name || t("noName")}
              {isCurrentUser && (
                <span className="badge badge-sm ml-2">{t("you")}</span>
              )}
              {isNewAccount && (
                <span
                  className="badge badge-warning badge-sm ml-2"
                  title={t("newAccount")}
                >
                  {t("newAccount")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-base-content/60">
                {member.user.email}
              </div>
              <ScoreBadge
                avgSeller={member.user.avgSellerRating}
                sellerCount={member.user.sellerRatingCount}
                avgBuyer={member.user.avgBuyerRating}
                buyerCount={member.user.buyerRatingCount}
              />
            </div>
          </div>
        </div>
      </td>
      <td>
        {canModify ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value)}
            disabled={isLoading}
            className="select select-bordered select-sm"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`badge ${ROLE_COLORS[member.role] || "badge-ghost"}`}
          >
            {getRoleLabel(member.role)}
          </span>
        )}
      </td>
      <td className="text-sm text-base-content/60">
        {formatShortDate(member.joinedAt)}
      </td>
      <td className="text-sm text-base-content/60">
        {member.invitedBy
          ? member.invitedBy.name || member.invitedBy.email
          : "—"}
      </td>
      {isAdmin && (
        <td className="text-right">
          {canModify && (
            <div className="flex justify-end gap-1">
              <button
                onClick={() =>
                  onBan(
                    member.id,
                    member.user.name || member.user.email,
                    member.user.id,
                  )
                }
                disabled={isLoading}
                className="btn btn-ghost btn-sm text-warning"
                title={t("ban")}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <span className="icon-[tabler--ban] size-4"></span>
                )}
              </button>
              <button
                onClick={() =>
                  onRemove(member.id, member.user.name || member.user.email)
                }
                disabled={isLoading}
                className="btn btn-ghost btn-sm text-error"
                title={t("remove")}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <span className="icon-[tabler--trash] size-4"></span>
                )}
              </button>
            </div>
          )}
        </td>
      )}
    </tr>
  );
}
