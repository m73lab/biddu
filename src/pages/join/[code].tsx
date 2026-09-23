import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  InvitePortal,
  PortalAuctionInfo,
} from "@/components/invite/InvitePortal";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

interface InviteCodeInfo {
  auction: PortalAuctionInfo;
  createdBy: {
    name: string | null;
    storeName: string | null;
  };
  role: string;
  code: string;
  usesCount: number;
  maxUses: number | null;
}

export default function JoinByCodePage() {
  const router = useRouter();
  const { code } = router.query;
  const { status } = useSession();
  const t = useTranslations("auction.acceptInvite");
  const tErrors = useTranslations("errors");

  const [info, setInfo] = useState<InviteCodeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!code) return;

    const fetchCode = async () => {
      try {
        const res = await fetch(
          `/api/invite-codes/${encodeURIComponent(code as string)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || tErrors("invite.invalidInvite"));
        } else {
          setInfo(data);
        }
      } catch {
        setError("Failed to load invite code");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCode();
  }, [code, tErrors]);

  const handleAccept = async () => {
    if (!code) return;

    setIsAccepting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/invite-codes/${encodeURIComponent(code as string)}`,
        { method: "POST" },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to join auction");
      } else {
        router.push(`/auctions/${data.auctionId}`);
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsAccepting(false);
    }
  };

  if (!info) {
    return (
      <InvitePortal
        status={isLoading ? "loading" : "invalid"}
        invalidMessage={error}
        title=""
        subtitle=""
        auction={null}
        inviterRowLabel=""
        inviterName=""
        roleLabel=""
        role=""
        error={null}
      >
        {null}
      </InvitePortal>
    );
  }

  const isLoggedIn = status === "authenticated";

  return (
    <InvitePortal
      status="ready"
      invalidMessage={null}
      title={t("codeTitle")}
      subtitle={t("codeSubtitle")}
      auction={info.auction}
      inviterRowLabel={t("sharedBy")}
      inviterName={info.createdBy.storeName || info.createdBy.name || t("hostNoName")}
      roleLabel={t("yourRole")}
      role={info.role}
      headerBadge={
        <span className="badge badge-outline badge-lg font-mono tracking-widest">
          {info.code}
        </span>
      }
      error={error}
    >
      {!isLoggedIn ? (
        <div className="space-y-4">
          <div className="text-center p-4 bg-base-200/50 rounded-xl mb-2">
            <p className="text-base-content/80 font-medium mb-1">
              {t("loginRequired")}
            </p>
          </div>

          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/join/${code}`)}`}
            className="btn btn-primary w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
          >
            {t("loginToAccept")}
          </Link>
          <div className="text-center">
            <span className="text-xs text-base-content/40 uppercase font-bold tracking-widest">
              {t("or")}
            </span>
          </div>
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(`/join/${code}`)}`}
            className="btn btn-outline w-full hover:bg-base-content/5"
          >
            {t("createAccount")}
          </Link>
        </div>
      ) : (
        <Button
          onClick={handleAccept}
          variant="primary"
          modifier="block"
          isLoading={isAccepting}
          loadingText={t("joining")}
          icon={<span className="icon-[tabler--check] size-5"></span>}
          className="btn-lg shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
        >
          {t("accept")}
        </Button>
      )}
    </InvitePortal>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const messages = await getMessages(context.locale as Locale);
  return {
    props: {
      messages,
    },
  };
};
