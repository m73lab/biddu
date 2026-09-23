import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/fetcher";
import { PageLayout, BackLink, SEO } from "@/components/common";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";
import { isValidPhone } from "@/utils/phone";
import { isValidRut } from "@/utils/rut";

interface ProfileData {
  id: string;
  name: string | null;
  storeName: string | null;
  email: string;
  avatarSeed: string | null;
  phone: string | null;
  rut: string | null;
}

interface ScoreData {
  avgSellerRating: number | null;
  sellerRatingCount: number;
  avgBuyerRating: number | null;
  buyerRatingCount: number;
  recent: Array<{
    id: string;
    role: "BUYER" | "SELLER";
    score: number;
    comment: string | null;
    createdAt: string;
    raterName: string | null;
    itemId: string;
    itemName: string;
    auctionId: string;
  }>;
}

interface StatsData {
  bidsPlaced: number;
  auctionsWon: number;
  itemsSold: number;
  auctionsCreated: number;
  auctionsJoined: number;
  memberSince: string;
}

interface ProfilePageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

function randomSeed(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `avatar-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const { update: updateSession } = useSession();

  const { data: profile, mutate: mutateProfile } = useSWR<ProfileData>(
    "/api/user/profile",
    fetcher,
  );
  const { data: score } = useSWR<ScoreData>(
    `/api/user/rating?userId=${user.id}`,
    fetcher,
  );
  const { data: stats } = useSWR<StatsData>("/api/user/stats", fetcher);

  const [draftSeed, setDraftSeed] = useState<string | null | undefined>(
    undefined,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Personal data form (name / store name / phone / RUT)
  const [personalName, setPersonalName] = useState<string | undefined>(
    undefined,
  );
  const [personalStoreName, setPersonalStoreName] = useState<
    string | undefined
  >(undefined);
  const [personalPhone, setPersonalPhone] = useState<string | undefined>(
    undefined,
  );
  const [personalRut, setPersonalRut] = useState<string | undefined>(undefined);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  useEffect(() => {
    if (profile && personalName === undefined) {
      setPersonalName(profile.name ?? "");
      setPersonalStoreName(profile.storeName ?? "");
      setPersonalPhone(profile.phone ?? "");
      setPersonalRut(profile.rut ?? "");
    }
  }, [profile, personalName]);

  useEffect(() => {
    if (draftSeed === undefined && profile) {
      setDraftSeed(profile.avatarSeed);
    }
  }, [profile, draftSeed]);

  const currentSeed = draftSeed === undefined ? (profile?.avatarSeed ?? null) : draftSeed;
  const dirty =
    draftSeed !== undefined && draftSeed !== (profile?.avatarSeed ?? null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarSeed: currentSeed }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(result.message || t("saveFailed"), "error");
        return;
      }
      await mutateProfile();
      await updateSession().catch(() => undefined);
      showToast(t("saveSuccess"), "success");
    } catch {
      showToast(t("saveFailed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePersonalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (personalName ?? "").trim();
    const storeName = (personalStoreName ?? "").trim();
    const phone = (personalPhone ?? "").trim();
    const rut = (personalRut ?? "").trim();

    if (!name) {
      showToast(t("personal.nameRequired"), "error");
      return;
    }
    if (phone && !isValidPhone(phone)) {
      showToast(t("personal.phoneInvalid"), "error");
      return;
    }
    if (rut && !isValidRut(rut)) {
      showToast(t("personal.rutInvalid"), "error");
      return;
    }

    setIsSavingPersonal(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, storeName: storeName || null, phone: phone || null, rut: rut || null }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(result.message || t("personal.saveFailed"), "error");
        return;
      }
      await mutateProfile();
      await updateSession().catch(() => undefined);
      showToast(t("personal.saved"), "success");
    } catch {
      showToast(t("personal.saveFailed"), "error");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  return (
    <>
      <SEO title={t("title")} description={t("subtitle")} />
      <PageLayout user={user} maxWidth="2xl">
        <div className="mb-8">
          <BackLink href="/dashboard" label={t("backToDashboard")} />
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="icon-[tabler--user] size-7"></span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-base-content/60">{t("subtitle")}</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
          <div className="card-body p-8">
            <h2 className="card-title text-lg flex items-center gap-2 mb-4">
              <span className="icon-[tabler--photo] size-5 text-primary"></span>
              {t("avatarTitle")}
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <UserAvatar
                name={profile?.name ?? user.name}
                email={profile?.email ?? user.email}
                seed={user.id}
                avatarSeed={currentSeed}
                size="xl"
                loading={!profile}
              />
              <div className="flex-1 w-full">
                <p className="text-sm text-base-content/60 mb-3">
                  {t("avatarHint")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftSeed(randomSeed())}
                    className="btn btn-outline gap-2"
                  >
                    <span className="icon-[tabler--refresh] size-4"></span>
                    {t("random")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftSeed(null)}
                    className="btn btn-ghost gap-2"
                  >
                    {t("reset")}
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                    loadingText={t("saving")}
                    disabled={!dirty}
                  >
                    {t("save")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal data */}
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
          <div className="card-body p-8">
            <h2 className="card-title text-lg flex items-center gap-2 mb-4">
              <span className="icon-[tabler--user] size-5 text-primary"></span>
              {t("personal.title")}
            </h2>
            {!profile ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : (
              <form onSubmit={handlePersonalSave} className="space-y-5">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      {t("personal.email")}
                    </span>
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    className="input input-bordered w-full bg-base-200/50 opacity-70"
                    disabled
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50 flex items-center gap-1">
                      <span className="icon-[tabler--lock] size-3"></span>
                      {t("personal.emailCannotChange")}
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      {t("personal.displayName")}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={personalName ?? ""}
                    onChange={(e) => setPersonalName(e.target.value)}
                    placeholder={t("personal.displayNamePlaceholder")}
                    className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      {t("personal.storeName")}{" "}
                      <span className="text-base-content/40 text-xs">
                        ({t("personal.optional")})
                      </span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={personalStoreName ?? ""}
                    onChange={(e) => setPersonalStoreName(e.target.value)}
                    placeholder={t("personal.storeNamePlaceholder")}
                    maxLength={100}
                    className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50 flex items-center gap-1">
                      <span className="icon-[tabler--building-store] size-3"></span>
                      {t("personal.storeNameHint")}
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      {t("personal.phone")}{" "}
                      <span className="text-base-content/40 text-xs">
                        ({t("personal.optional")})
                      </span>
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={personalPhone ?? ""}
                    onChange={(e) => setPersonalPhone(e.target.value)}
                    placeholder={t("personal.phonePlaceholder")}
                    autoComplete="tel"
                    maxLength={20}
                    className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50 flex items-center gap-1">
                      <span className="icon-[tabler--brand-whatsapp] size-3"></span>
                      {t("personal.phoneHint")}
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      RUT{" "}
                      <span className="text-base-content/40 text-xs">
                        ({t("personal.optional")})
                      </span>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="12.345.678-9"
                    value={personalRut ?? ""}
                    onChange={(e) => setPersonalRut(e.target.value)}
                    maxLength={20}
                    className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  />
                  <label className="label">
                    <span className="label-text-alt text-base-content/50">
                      {t("personal.rutHint")}
                    </span>
                  </label>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingPersonal}
                    loadingText={t("saving")}
                    icon={
                      <span className="icon-[tabler--device-floppy] size-5"></span>
                    }
                    className="w-full sm:w-auto shadow-lg shadow-primary/20"
                  >
                    {t("save")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
          <div className="card-body p-8">
            <h2 className="card-title text-lg flex items-center gap-2 mb-4">
              <span className="icon-[tabler--star] size-5 text-warning"></span>
              {t("ratingTitle")}
            </h2>
            {!score ||
            (score.sellerRatingCount === 0 &&
              score.buyerRatingCount === 0) ? (
              <p className="text-sm text-base-content/60">{t("noRatings")}</p>
            ) : (
              <>
                <div className="mb-4">
                  <ScoreBadge
                    avgSeller={score.avgSellerRating}
                    sellerCount={score.sellerRatingCount}
                    avgBuyer={score.avgBuyerRating}
                    buyerCount={score.buyerRatingCount}
                    size="sm"
                  />
                </div>
                {score.recent.length > 0 && (
                  <ul className="divide-y divide-base-content/5">
                    {score.recent.map((r) => (
                      <li key={r.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="icon-[tabler--star-filled] size-4 text-warning"></span>
                          <span className="font-bold">{r.score}/5</span>
                          <span className="text-xs text-base-content/50">
                            {r.role === "SELLER"
                              ? t("asSeller")
                              : t("asBuyer")}
                            {" · "}
                            {r.raterName ?? t("anonymous")}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-base-content/70 mt-1">
                            {r.comment}
                          </p>
                        )}
                        <Link
                          href={`/auctions/${r.auctionId}/items/${r.itemId}`}
                          className="text-xs link link-primary"
                        >
                          {r.itemName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
          <div className="card-body p-8">
            <h2 className="card-title text-lg flex items-center gap-2 mb-4">
              <span className="icon-[tabler--chart-bar] size-5 text-secondary"></span>
              {t("statsTitle")}
            </h2>
            {!stats ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner text-primary"></span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatsCard
                  icon="icon-[tabler--gavel]"
                  iconColor="primary"
                  value={stats.bidsPlaced}
                  label={t("bidsPlaced")}
                />
                <StatsCard
                  icon="icon-[tabler--trophy]"
                  iconColor="warning"
                  value={stats.auctionsWon}
                  label={t("auctionsWon")}
                />
                <StatsCard
                  icon="icon-[tabler--package]"
                  iconColor="accent"
                  value={stats.itemsSold}
                  label={t("itemsSold")}
                />
                <StatsCard
                  icon="icon-[tabler--crown]"
                  iconColor="secondary"
                  value={stats.auctionsCreated}
                  label={t("auctionsCreated")}
                />
                <StatsCard
                  icon="icon-[tabler--users]"
                  iconColor="accent"
                  value={stats.auctionsJoined}
                  label={t("auctionsJoined")}
                />
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    </>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      messages,
    },
  };
});
