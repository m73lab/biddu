import Link from "next/link";
import { useState } from "react";
import { GetServerSideProps } from "next";
import { PageLayout } from "@/components/common";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";
import * as auctionService from "@/lib/services/auction.service";
import * as itemService from "@/lib/services/item.service";
import { prisma } from "@/lib/prisma";
import { formatCurrency, decimalsForCurrency } from "@/utils/formatters";
import { waLink } from "@/utils/phone";

interface ContactPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auctionId: string;
  auctionName: string;
  itemId: string;
  itemName: string;
  winningBid: string;
  winnerName: string;
  winnerEmail: string;
  winnerPhone: string | null;
  ownerName: string;
}

export default function ContactWinnerPage({
  user,
  auctionId,
  auctionName,
  itemId,
  itemName,
  winningBid,
  winnerName,
  winnerEmail,
  winnerPhone,
  ownerName,
}: ContactPageProps) {
  const t = useTranslations("item.detail.contact");
  const [copied, setCopied] = useState<string | null>(null);

  const defaultMessage = t("template", {
    winner: winnerName,
    item: itemName,
    amount: winningBid,
    auction: auctionName,
    owner: ownerName,
  });
  const [message, setMessage] = useState(defaultMessage);

  const copy = async (text: string, which: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const mailto = `mailto:${winnerEmail}?subject=${encodeURIComponent(
    t("mailSubject", { item: itemName }),
  )}&body=${encodeURIComponent(message)}`;

  return (
    <PageLayout user={user}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="icon-[tabler--mail] size-7"></span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-base-content/60">
              {t("subtitle", { item: itemName })}
            </p>
          </div>
        </div>

        {/* Winner card */}
        <div className="card bg-base-100 border border-base-content/5 shadow-sm mt-6">
          <div className="card-body p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-widest text-base-content/50 font-bold">
                  {t("winner")}
                </div>
                <div className="text-lg font-bold">{winnerName}</div>
                <div className="text-sm text-base-content/60 font-mono">
                  {winnerEmail}
                </div>
                {winnerPhone && (
                  <div className="text-sm text-base-content/60 font-mono flex items-center gap-1">
                    <span className="icon-[tabler--brand-whatsapp] size-4"></span>
                    {winnerPhone}
                  </div>
                )}
                <div className="text-sm mt-1">
                  {t("winningBid")}:{" "}
                  <span className="font-mono font-bold text-primary">
                    {winningBid}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copy(winnerEmail, "email")}
                className="btn btn-sm btn-outline gap-2"
              >
                <span className="icon-[tabler--copy] size-4"></span>
                {copied === "email" ? t("copied") : t("copyEmail")}
              </button>
            </div>
          </div>
        </div>

        {/* Message template */}
        <div className="card bg-base-100 border border-base-content/5 shadow-sm mt-4">
          <div className="card-body p-5">
            <label className="font-bold mb-2 block" htmlFor="contact-message">
              {t("messageLabel")}
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="textarea textarea-bordered w-full leading-relaxed"
            />
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={() => copy(message, "message")}
                className="btn btn-outline gap-2"
              >
                <span className="icon-[tabler--copy] size-5"></span>
                {copied === "message" ? t("copied") : t("copyMessage")}
              </button>
              <a href={mailto} className="btn btn-primary gap-2">
                <span className="icon-[tabler--send] size-5"></span>
                {t("openMail")}
              </a>
              {winnerPhone ? (
                <a
                  href={waLink(winnerPhone, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success gap-2"
                >
                  <span className="icon-[tabler--brand-whatsapp] size-5"></span>
                  {t("openWhatsapp")}
                </a>
              ) : (
                <p className="text-xs text-base-content/50 italic w-full">
                  {t("noPhoneOwner")}
                </p>
              )}
            </div>
            <p className="text-xs text-base-content/50 mt-3">{t("mailHint")}</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href={`/auctions/${auctionId}/items/${itemId}`}
            className="btn btn-ghost gap-2"
          >
            <span className="icon-[tabler--arrow-left] size-5"></span>
            {t("backToItem")}
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const auctionId = context.params?.id as string;
  const itemId = context.params?.itemId as string;
  const viewerId = context.session.user.id;

  const membership = await auctionService.getUserMembership(
    auctionId,
    viewerId,
  );
  if (!membership) {
    return {
      redirect: { destination: "/dashboard", permanent: false },
    };
  }

  const item = await itemService.getItemById(itemId);
  if (
    !item ||
    item.auctionId !== auctionId ||
    !item.endDate ||
    item.endDate > new Date() ||
    !item.highestBidderId ||
    item.creatorId !== viewerId
  ) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}/items/${itemId}`,
        permanent: false,
      },
    };
  }

  const [winner, auction] = await Promise.all([
    prisma.user.findUnique({
      where: { id: item.highestBidderId },
      select: { name: true, email: true, phone: true },
    }),
    prisma.auction.findUnique({
      where: { id: auctionId },
      select: { name: true },
    }),
  ]);
  if (!winner || !auction) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}/items/${itemId}`,
        permanent: false,
      },
    };
  }

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      auctionId,
      auctionName: auction.name,
      itemId,
      itemName: item.name,
      winningBid: formatCurrency(
        item.currentBid ?? 0,
        item.currency.symbol,
        decimalsForCurrency(item.currency.code),
      ),
      winnerName: winner.name || winner.email,
      winnerEmail: winner.email,
      winnerPhone: winner.phone || null,
      ownerName:
        context.session.user.name || context.session.user.email || "",
      messages,
    },
  };
});
