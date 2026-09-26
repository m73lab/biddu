import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  InvitePortal,
  PortalAuctionInfo,
} from "@/components/invite/InvitePortal";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

interface InviteInfo {
  auction: PortalAuctionInfo;
  sender: {
    name: string | null;
    storeName: string | null;
    email: string;
  };
  role: string;
  email: string;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { data: session, status } = useSession();
  const t = useTranslations("auction.acceptInvite");
  const tErrors = useTranslations("errors");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || tErrors("invite.invalidInvite"));
        } else {
          setInvite(data);
        }
      } catch {
        setError("Failed to load invite");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token, tErrors]);

  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to accept invite");
      } else {
        router.push(`/auctions/${data.auctionId}`);
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsAccepting(false);
    }
  };

  if (!invite) {
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
  const emailMatches =
    session?.user?.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <InvitePortal
      status="ready"
      invalidMessage={null}
      title={t("title")}
      subtitle={t("subtitle")}
      auction={invite.auction}
      inviterRowLabel={t("invitedBy")}
      inviterName={invite.sender.storeName || invite.sender.name || invite.sender.email}
      roleLabel={t("yourRole")}
      role={invite.role}
      error={error}
    >
      {!isLoggedIn ? (
        <div className="space-y-4">
          <div className="text-center p-4 bg-base-200/50 rounded-xl mb-2">
            <p className="text-base-content/80 font-medium mb-1">
              {t("loginRequired")}
            </p>
            <p className="text-sm text-base-content/60">
              {t("sentTo")}{" "}
              <span className="font-bold text-base-content/80">
                {invite.email}
              </span>
            </p>
          </div>

          <Link
            href={`/login?callbackUrl=${encodeURIComponent(
              `/invite/${token}`,
            )}&email=${encodeURIComponent(invite.email)}`}
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
            href={`/register?callbackUrl=${encodeURIComponent(
              `/invite/${token}`,
            )}&email=${encodeURIComponent(invite.email)}`}
            className="btn btn-outline w-full hover:bg-base-content/5"
          >
            {t("createAccount")}
          </Link>
        </div>
      ) : !emailMatches ? (
        <div className="space-y-4">
          <div className="alert alert-warning shadow-sm">
            <span className="icon-[tabler--alert-triangle] size-5"></span>
            <div className="text-sm">
              <p className="font-bold mb-1">{t("wrongAccount")}</p>
              <p>
                {t("inviteFor")}{" "}
                <strong className="font-mono">{invite.email}</strong>
              </p>
              <p>
                {t("loggedInAs")}{" "}
                <strong className="font-mono">{session.user?.email}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: `/invite/${token}` })}
            className="btn btn-primary w-full shadow-lg shadow-primary/20"
          >
            {t("switchAccount")}
          </button>
          <Link href="/dashboard" className="btn btn-ghost w-full">
            {t("dashboard")}
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
