import Link from "next/link";
import { GetServerSideProps } from "next";
import { PageLayout } from "@/components/common";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";

interface AyudaPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function AyudaPage({ user }: AyudaPageProps) {
  const tFaq = useTranslations("landing.faq");
  const tNav = useTranslations("nav");

  const items = tFaq.raw("items") as Array<{ q: string; a: string }>;

  return (
    <PageLayout user={user}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="icon-[tabler--lifebuoy] size-7"></span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tNav("help")}</h1>
            <p className="text-base-content/60">{tFaq("subtitle")}</p>
          </div>
        </div>

        <div className="space-y-4 mt-8">
          {items.map((item, i) => (
            <div
              key={i}
              className="collapse collapse-plus bg-base-100 border border-base-content/5 rounded-2xl shadow-sm"
            >
              <input
                type="radio"
                name="ayuda-faq"
                defaultChecked={i === 0}
              />
              <div className="collapse-title text-lg font-bold">
                {item.q}
              </div>
              <div className="collapse-content text-base-content/70 leading-relaxed">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="btn btn-ghost gap-2"
          >
            <span className="icon-[tabler--arrow-left] size-5"></span>
            {tNav("dashboard")}
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      messages: await getMessages(context.locale as Locale),
    },
  };
});
