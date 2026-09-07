import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PageLayout, EmptyState, SEO } from "@/components/common";
import { AuctionCard } from "@/components/auction";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";

interface Auction {
  id: string;
  name: string;
  description: string | null;
  endDate: string | null;
  createdAt: string;
  role: string;
  thumbnailUrl: string | null;
  _count: {
    items: number;
    members: number;
  };
}

interface DashboardData {
  auctions: Auction[];
}

interface MinePageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function MyAuctionsPage({ user }: MinePageProps) {
  const t = useTranslations("dashboard");
  const tEmpty = useTranslations("dashboard.empty");
  const { data, isLoading } = useSWR<DashboardData>(
    "/api/user/dashboard",
    fetcher,
  );

  const myAuctions = (data?.auctions ?? []).filter(
    (a) => a.role === "OWNER",
  );

  return (
    <>
      <SEO
        title={t("myAuctions.title")}
        description={t("myAuctions.description")}
      />
      <PageLayout user={user}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--crown] size-7"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("myAuctions.title")}</h1>
              <p className="text-base-content/60">
                {t("myAuctions.description")}
              </p>
            </div>
          </div>
          <Link
            href="/auctions/create"
            className="btn btn-primary w-full sm:w-auto"
          >
            <span className="icon-[tabler--plus] size-5"></span>
            {t("createAuction")}
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : myAuctions.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <EmptyState
                icon="icon-[tabler--crown]"
                title={t("myAuctions.title")}
                description={t("myAuctions.description")}
                action={
                  <Link href="/auctions/create" className="btn btn-primary">
                    <span className="icon-[tabler--plus] size-5"></span>
                    {tEmpty("createFirst")}
                  </Link>
                }
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
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
