import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Client-side initial-setup guard.
 *
 * The proxy (edge runtime) cannot touch the database, so the
 * "redirect to /setup while the deployment has no admin" rule lives here:
 * on every page navigation we ask `/api/setup/status` (deployment-global
 * state, cheap: one settings read + one count) and bounce to `/setup`
 * while setup is still required.
 *
 * Server-side backstop: `/setup`'s getServerSideProps redirects away once
 * setup is complete, so the wizard can never be reused afterward.
 */
export function SetupGuard() {
  const router = useRouter();

  useEffect(() => {
    if (router.pathname === "/setup") return;

    let cancelled = false;
    fetch("/api/setup/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.setupRequired) {
          router.replace("/setup");
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [router.pathname, router]);

  return null;
}
