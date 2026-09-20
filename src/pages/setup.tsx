import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { GetServerSideProps } from "next";
import { AlertMessage, SEO } from "@/components/common";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { ensureEnvAdmin, getSetupStatus } from "@/lib/services/setup.service";

interface SetupPageProps {
  emailEnabled: boolean;
}

export default function SetupPage({ emailEnabled }: SetupPageProps) {
  const t = useTranslations("setup");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setFieldErrors({
        confirmPassword: tErrors("validation.passwordsDoNotMatch"),
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setFieldErrors({
        password: tErrors("validation.passwordTooShort", { min: 8 }),
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details?.errors) {
          setFieldErrors(data.details.errors);
        } else if (res.status === 403) {
          setError(t("alreadyCompleted"));
        } else {
          setError(data.message || t("setupFailed"));
        }
        setIsLoading(false);
        return;
      }

      // The setup account is created already verified: sign in directly.
      await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
      });
    } catch {
      setError(tErrors("generic"));
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO title={t("seoTitle")} description={t("seoDescription")} />
      <div className="min-h-screen flex flex-col lg:flex-row bg-base-100">
        {/* Left side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-base-200 overflow-hidden items-center justify-center">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center max-w-lg">
            <Link href="/" className="mb-8 group">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-base-100 shadow-2xl shadow-primary/10 border border-base-content/5 mb-6 group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/logo.svg"
                  alt="Biddú"
                  className="h-12 w-12 transition-transform group-hover:-rotate-6 duration-300"
                />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                {tCommon("appName")}
              </h1>
            </Link>

            <h2 className="text-2xl font-bold mb-4">{t("brandingTitle")}</h2>
            <p className="text-base-content/60 text-lg leading-relaxed">
              {t("brandingDescription")}
            </p>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="flex-1 lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-base-100">
          <Link
            href="/"
            className="lg:hidden absolute top-8 left-6 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.svg" alt="Biddú" className="h-6 w-6" />
            <span className="text-lg font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              {tCommon("appName")}
            </span>
          </Link>

          <div className="w-full max-w-[400px] mt-14 lg:mt-0">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-base-content mb-2">
                {t("title")}
              </h2>
              <p className="text-base-content/60">{t("subtitle")}</p>
            </div>

            <div className="alert alert-info mb-6">
              <span className="icon-[tabler--shield-check] size-5"></span>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{t("adminNoteTitle")}</span>
                <span className="text-sm opacity-80">
                  {t("adminNoteMessage")}
                </span>
              </div>
            </div>

            {!emailEnabled && (
              <div className="alert alert-warning mb-6">
                <span className="icon-[tabler--mail-off] size-5"></span>
                <span className="text-sm">{t("emailDisabledHint")}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <AlertMessage type="error">{error}</AlertMessage>}

              <div className="form-control">
                <label className="label pl-0" htmlFor="name">
                  <span className="label-text font-medium text-base-content/80">
                    {t("fullName")}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--user] size-5"></span>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder={t("fullNamePlaceholder")}
                    autoComplete="name"
                    className={`input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                      fieldErrors.name ? "input-error" : ""
                    }`}
                    required
                  />
                </div>
                {fieldErrors.name && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {fieldErrors.name}
                    </span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label pl-0" htmlFor="email">
                  <span className="label-text font-medium text-base-content/80">
                    {t("email")}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--mail] size-5"></span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    autoComplete="email"
                    className={`input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                      fieldErrors.email ? "input-error" : ""
                    }`}
                    required
                  />
                </div>
                {fieldErrors.email && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {fieldErrors.email}
                    </span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label pl-0" htmlFor="password">
                    <span className="label-text font-medium text-base-content/80">
                      {t("password")}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--lock] size-5"></span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      autoComplete="new-password"
                      className={`input input-bordered w-full pl-10 pr-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                        fieldErrors.password ? "input-error" : ""
                      }`}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                      aria-label={
                        showPassword ? t("hidePassword") : t("showPassword")
                      }
                    >
                      <span
                        className={`${showPassword ? "icon-[tabler--eye-off]" : "icon-[tabler--eye]"} size-5 block`}
                      />
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.password}
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label pl-0" htmlFor="confirmPassword">
                    <span className="label-text font-medium text-base-content/80">
                      {t("confirmPassword")}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 icon-[tabler--lock-check] size-5"></span>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("confirmPasswordPlaceholder")}
                      autoComplete="new-password"
                      className={`input input-bordered w-full pl-10 bg-base-200/50 focus:bg-base-100 transition-colors ${
                        fieldErrors.confirmPassword ? "input-error" : ""
                      }`}
                      required
                      minLength={8}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.confirmPassword}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                modifier="block"
                isLoading={isLoading}
                loadingText={t("submitting")}
                className="btn-lg text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                {t("submitButton")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SetupPageProps> = async (
  context,
) => {
  // Env seed wins over the wizard: a configured INITIAL_ADMIN_* completes
  // the setup before the page even renders (fully automated deployments).
  await ensureEnvAdmin().catch(() => undefined);

  const [status, messages] = await Promise.all([
    getSetupStatus(),
    getMessages(context.locale as Locale),
  ]);

  if (!status.setupRequired) {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }

  const { isEmailEnabled } = await import("@/lib/email");

  return {
    props: {
      messages,
      emailEnabled: isEmailEnabled(),
    },
  };
};
