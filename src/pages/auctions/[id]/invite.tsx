import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import * as auctionService from "@/lib/services/auction.service";
import * as inviteService from "@/lib/services/invite.service";
import { Navbar } from "@/components/layout/navbar";
import { Pagination, ConfirmModal } from "@/components/common";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";
import { parsePagination } from "@/lib/api/pagination";

interface Invite {
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

interface InviteCode {
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

interface InvitePageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    memberCanInvite: boolean;
  };
  isAdmin: boolean;
  invites: Invite[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export default function InvitePage({
  user,
  auction,
  isAdmin,
  invites: initialInvites,
  pagination,
}: InvitePageProps) {
  const t = useTranslations("auction.invite");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tStatus = useTranslations("status");
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("BIDDER");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Shareable invite codes
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [codeRole, setCodeRole] = useState("BIDDER");
  const [codeMaxUses, setCodeMaxUses] = useState("");
  const [codeExpiry, setCodeExpiry] = useState("30");
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [codeToRevoke, setCodeToRevoke] = useState<InviteCode | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Resync list after SSR page navigation (page/pageSize change)
  useEffect(() => {
    setInvites(initialInvites);
  }, [initialInvites]);

  // Load invite codes once (admins see all, other inviters their own)
  useEffect(() => {
    const loadCodes = async () => {
      try {
        const res = await fetch(`/api/auctions/${auction.id}/invite-codes`);
        if (res.ok) setCodes(await res.json());
      } catch {
        // Codes section stays empty on failure
      }
    };
    loadCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (page: number, pageSize: number = pagination.pageSize) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, page, pageSize },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: isAdmin ? role : "BIDDER" }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(
          result.errors?.email ||
            result.message ||
            tErrors("invite.sendFailed"),
        );
      } else {
          showToast(`Invite sent to ${email}`, "success");
          setEmail("");
          // New invites land on page 1: prepend locally if already there,
          // otherwise navigate so the fresh SSR page shows it
          if (isAdmin) {
            if (pagination.page === 1) {
              setInvites([result, ...invites]);
            } else {
              goToPage(1);
            }
          }
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const getInviteLink = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/invite/${token}`;
    }
    return `/invite/${token}`;
  };

  const copyToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getInviteLink(token));
      showToast(tCommon("copied"), "success");
    } catch {
      setError("Failed to copy link");
    }
  };

  const getCodeLink = (code: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/join/${code}`;
    }
    return `/join/${code}`;
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(t("codes.copiedCode", { code }), "success");
    } catch {
      setError(t("codes.copyFailed"));
    }
  };

  const copyCodeLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(getCodeLink(code));
      showToast(tCommon("copied"), "success");
    } catch {
      setError(t("codes.copyFailed"));
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreatingCode(true);

    try {
      const maxUses = codeMaxUses.trim() === "" ? null : Number(codeMaxUses);
      const res = await fetch(`/api/auctions/${auction.id}/invite-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: isAdmin ? codeRole : "BIDDER",
          maxUses,
          expiresInDays: codeExpiry === "never" ? null : Number(codeExpiry),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || t("codes.createFailed"));
      } else {
        showToast(t("codes.created", { code: result.code }), "success");
        setCodes([result, ...codes]);
        setCodeMaxUses("");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsCreatingCode(false);
    }
  };

  const handleRevokeCode = async () => {
    if (!codeToRevoke) return;
    setIsRevoking(true);
    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/invite-codes/${codeToRevoke.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const result = await res.json();
        setError(result.message || t("codes.revokeFailed"));
      } else {
        showToast(t("codes.revoked"), "success");
        setCodes(
          codes.map((c) =>
            c.id === codeToRevoke.id
              ? { ...c, revokedAt: new Date().toISOString() }
              : c,
          ),
        );
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsRevoking(false);
      setCodeToRevoke(null);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 relative overflow-x-hidden selection:bg-primary/20">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[128px] translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[128px] -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="relative z-10">
        <Navbar user={user} />

        <main className="container mx-auto px-4 py-8 pb-12 max-w-2xl">
          <div className="mb-8">
            <Link
              href={`/auctions/${auction.id}`}
              className="btn btn-ghost btn-sm gap-2 hover:bg-base-content/5"
            >
              <span className="icon-[tabler--arrow-left] size-4"></span>
              {t("backTo", { name: auction.name })}
            </Link>
          </div>

          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
            <div className="card-body p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="icon-[tabler--user-plus] size-7"></span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t("title")}</h1>
                  <p className="text-base-content/60">{t("subtitle")}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="alert alert-error shadow-sm">
                    <span className="icon-[tabler--alert-circle] size-5"></span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      {t("emailAddress")}
                    </span>
                  </label>
                  <div className="join w-full">
                    <div className="relative w-full">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--mail] size-5"></span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("emailPlaceholder")}
                        className="input input-bordered w-full pl-10 bg-base-100 focus:bg-base-100 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        {t("role")}
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label
                        className={`cursor-pointer border rounded-xl p-3 hover:border-primary/50 transition-all ${
                          role === "BIDDER"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-base-100 border-base-content/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="role"
                            value="BIDDER"
                            checked={role === "BIDDER"}
                            onChange={(e) => setRole(e.target.value)}
                            className="radio radio-primary radio-sm"
                          />
                          <span className="font-bold">Bidder</span>
                        </div>
                        <p className="text-xs text-base-content/60 pl-6">
                          {t("roleBidder").split(" - ")[1]}
                        </p>
                      </label>
                      <label
                        className={`cursor-pointer border rounded-xl p-3 hover:border-primary/50 transition-all ${
                          role === "CREATOR"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-base-100 border-base-content/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="role"
                            value="CREATOR"
                            checked={role === "CREATOR"}
                            onChange={(e) => setRole(e.target.value)}
                            className="radio radio-primary radio-sm"
                          />
                          <span className="font-bold">Creator</span>
                        </div>
                        <p className="text-xs text-base-content/60 pl-6">
                          {t("roleCreator").split(" - ")[1]}
                        </p>
                      </label>
                      <label
                        className={`cursor-pointer border rounded-xl p-3 hover:border-primary/50 transition-all ${
                          role === "ADMIN"
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-base-100 border-base-content/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="role"
                            value="ADMIN"
                            checked={role === "ADMIN"}
                            onChange={(e) => setRole(e.target.value)}
                            className="radio radio-primary radio-sm"
                          />
                          <span className="font-bold">Admin</span>
                        </div>
                        <p className="text-xs text-base-content/60 pl-6">
                          {t("roleAdmin").split(" - ")[1]}
                        </p>
                      </label>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  modifier="block"
                  isLoading={isLoading}
                  loadingText={t("sending")}
                  className="btn-lg shadow-lg shadow-primary/20"
                  icon={<span className="icon-[tabler--send] size-5"></span>}
                >
                    {t("sendInvite")}
                  </Button>
                </form>
              </div>
            </div>

          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mt-8">
            <div className="card-body p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="icon-[tabler--ticket] size-7"></span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{t("codes.title")}</h2>
                  <p className="text-base-content/60">
                    {t("codes.subtitle")}
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateCode} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {isAdmin && (
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">
                          {t("role")}
                        </span>
                      </label>
                      <select
                        value={codeRole}
                        onChange={(e) => setCodeRole(e.target.value)}
                        className="select select-bordered w-full bg-base-100"
                      >
                        <option value="BIDDER">Bidder</option>
                        <option value="CREATOR">Creator</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  )}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        {t("codes.maxUses")}
                      </span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={codeMaxUses}
                      onChange={(e) => setCodeMaxUses(e.target.value)}
                      placeholder={t("codes.unlimited")}
                      className="input input-bordered w-full bg-base-100"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">
                        {t("codes.expires")}
                      </span>
                    </label>
                    <select
                      value={codeExpiry}
                      onChange={(e) => setCodeExpiry(e.target.value)}
                      className="select select-bordered w-full bg-base-100"
                    >
                      <option value="7">{t("codes.days", { count: 7 })}</option>
                      <option value="30">
                        {t("codes.days", { count: 30 })}
                      </option>
                      <option value="90">
                        {t("codes.days", { count: 90 })}
                      </option>
                      <option value="never">{t("codes.never")}</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  modifier="block"
                  isLoading={isCreatingCode}
                  loadingText={t("codes.creating")}
                  icon={<span className="icon-[tabler--plus] size-5"></span>}
                >
                  {t("codes.create")}
                </Button>
              </form>

              {codes.length > 0 && (
                <div className="space-y-3 mt-6">
                  {codes.map((c) => (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                        c.revokedAt
                          ? "bg-base-200/50 border-transparent opacity-60"
                          : "bg-base-100 border-base-content/5 hover:border-secondary/20 hover:shadow-sm"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-base tracking-widest">
                            {c.code}
                          </span>
                          <span className="badge badge-xs badge-ghost">
                            {c.role}
                          </span>
                          {c.revokedAt && (
                            <span className="badge badge-xs badge-error">
                              {t("codes.revokedBadge")}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-base-content/60 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>
                            {t("codes.uses", {
                              used: c.usesCount,
                              max: c.maxUses ?? "∞",
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            {c.expiresAt
                              ? t("codes.expiresOn", {
                                  date: new Date(
                                    c.expiresAt,
                                  ).toLocaleDateString(),
                                })
                              : t("codes.never")}
                          </span>
                          {isAdmin && (
                            <>
                              <span>•</span>
                              <span>{c.createdBy.name || c.createdBy.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {!c.revokedAt && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyCode(c.code)}
                            className="btn btn-ghost btn-sm btn-circle tooltip tooltip-left"
                            data-tip={t("codes.copyCode")}
                          >
                            <span className="icon-[tabler--copy] size-5"></span>
                          </button>
                          <button
                            onClick={() => copyCodeLink(c.code)}
                            className="btn btn-ghost btn-sm btn-circle tooltip tooltip-left"
                            data-tip={t("codes.copyLink")}
                          >
                            <span className="icon-[tabler--link] size-5"></span>
                          </button>
                          <button
                            onClick={() => setCodeToRevoke(c)}
                            className="btn btn-ghost btn-sm btn-circle tooltip tooltip-left text-error"
                            data-tip={t("codes.revoke")}
                          >
                            <span className="icon-[tabler--ban] size-5"></span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ConfirmModal
            isOpen={!!codeToRevoke}
            title={t("codes.confirmRevokeTitle")}
            message={
              codeToRevoke
                ? t("codes.confirmRevoke", { code: codeToRevoke.code })
                : ""
            }
            confirmLabel={t("codes.revoke")}
            variant="error"
            isLoading={isRevoking}
            onConfirm={handleRevokeCode}
            onClose={() => !isRevoking && setCodeToRevoke(null)}
          />

          {isAdmin && pagination.total > 0 && (
            <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mt-8">
              <div className="card-body p-8">
                <h2 className="card-title text-lg mb-6 flex items-center gap-2">
                  <span className="icon-[tabler--mail] size-5 text-secondary"></span>
                    {t("pendingInvites")}
                    <span className="badge badge-ghost badge-sm">
                      {pagination.total}
                    </span>
                </h2>

                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        invite.usedAt
                          ? "bg-base-200/50 border-transparent opacity-60"
                          : "bg-base-100 border-base-content/5 hover:border-primary/20 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-base-content/90">
                          {invite.email}
                        </div>
                        <div className="text-sm text-base-content/60 flex items-center gap-2 mt-0.5">
                          <span className="badge badge-xs badge-ghost">
                            {invite.role}
                          </span>
                          <span>•</span>
                          <span>
                            {invite.usedAt
                              ? tStatus("accepted")
                              : tStatus("pending")}
                          </span>
                        </div>
                      </div>
                      {!invite.usedAt && (
                        <button
                          onClick={() => copyToClipboard(invite.token)}
                          className="btn btn-ghost btn-sm btn-circle tooltip tooltip-left"
                          data-tip={t("copyInviteLink")}
                        >
                          <span className="icon-[tabler--copy] size-5"></span>
                        </button>
                      )}
                      </div>
                    ))}
                  </div>
                  <Pagination
                    page={pagination.page}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onPageChange={(p) => goToPage(p)}
                    onPageSizeChange={(s) => goToPage(1, s)}
                  />
                </div>
              </div>
            )}
        </main>
      </div>
    </div>
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

  const isAdmin = auctionService.isAdmin(membership);
  const canInvite = isAdmin || membership.auction.memberCanInvite;

  if (!canInvite) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
        permanent: false,
      },
    };
  }

  // Only admins can see invite list (paginated server-side via ?page=&pageSize=)
  const { page, pageSize, skip, take } = parsePagination(context.query);
  const { invites, total } = isAdmin
    ? await inviteService.getAuctionInvitesForPage(auctionId, { skip, take })
    : { invites: [], total: 0 };

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
        memberCanInvite: membership.auction.memberCanInvite,
      },
      isAdmin,
      invites,
      pagination: { page, pageSize, total },
      messages: await getMessages(context.locale as Locale),
    },
  };
});
