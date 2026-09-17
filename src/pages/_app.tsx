import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";
import { UpdateBanner } from "@/components/common";
import { SetupGuard } from "@/components/common/SetupGuard";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AppProvider } from "@/contexts/AppContext";
import { TourProvider } from "@/components/tour";
import { fetcher } from "@/lib/fetcher";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const router = useRouter();

  // Pages without translated messages (Next.js default 500/error pages,
  // which cannot carry getStaticProps) must NOT render inside
  // NextIntlClientProvider: every useTranslations in the tree would throw
  // MISSING_MESSAGE (visible as dozens of build-prerender errors and a
  // broken page). Render them with a minimal provider set instead.
  if (!pageProps.messages) {
    return (
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    );
  }

  return (
    <NextIntlClientProvider
      locale={router.locale}
      timeZone="Europe/Budapest"
      messages={pageProps.messages}
    >
      <SessionProvider session={session}>
        <SWRConfig
          value={{
            fetcher,
            // Shared client cache: back/forward navigation reuses data
            // instead of flashing skeletons. Live bidding pages override
            // polling per-hook; freshness there wins over caching.
            provider: () => new Map(),
            dedupingInterval: 30000,
            focusThrottleInterval: 30000,
            revalidateOnFocus: false,
            keepPreviousData: true,
          }}
        >
          <AppProvider>
            <NotificationProvider>
              <ThemeProvider>
                <ToastProvider>
                  <TourProvider>
                    <UpdateBanner />
                    <SetupGuard />
                    <Component {...pageProps} />
                  </TourProvider>
                </ToastProvider>
              </ThemeProvider>
            </NotificationProvider>
          </AppProvider>
        </SWRConfig>
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
