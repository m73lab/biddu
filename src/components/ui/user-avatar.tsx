/**
 * UserAvatar - Deterministic generated avatar (Avatune, nevmstas theme)
 *
 * Same seed always renders the same face: pass the stable user id as
 * `seed` so the avatar never changes. Falls back to email, then name.
 * Clicking expands to a zoomed lightbox (portal to body).
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Avatar } from "@avatune/react";
import theme from "@avatune/nevmstas-theme/react";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  /** Stable identifier (user id). Preferred seed; falls back to email/name. */
  seed?: string | null;
  /** Custom avatar seed from DB (user-chosen). Takes precedence over seed. */
  avatarSeed?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Open zoom lightbox on click. Defaults to true. */
  expandable?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-24 h-24",
};

const sizePx = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 96,
};

export function UserAvatar({
  name,
  email,
  seed,
  avatarSeed,
  size = "sm",
  className = "",
  expandable = true,
}: UserAvatarProps) {
  const resolvedSeed = avatarSeed || seed || email || name || "biddu";
  const t = useTranslations("common");
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  const label = name || email || undefined;

  return (
    <>
      <div
        className={`rounded-full overflow-hidden shrink-0 ring-2 ring-primary/20 bg-base-200 ${sizeClasses[size]} ${className} ${
          expandable ? "cursor-zoom-in hover:ring-primary/50 transition-shadow" : ""
        }`}
        title={label}
        role={expandable ? "button" : undefined}
        aria-label={expandable ? label : undefined}
        onClick={
          expandable
            ? (e) => {
                e.stopPropagation();
                setExpanded(true);
              }
            : undefined
        }
      >
        <Avatar theme={theme} seed={resolvedSeed} size={sizePx[size]} />
      </div>
      {expanded && mounted
        ? createPortal(
            <div className="modal modal-open z-[200]">
              <div className="modal-box max-w-xs flex flex-col items-center gap-3">
                <div className="rounded-3xl overflow-hidden ring-4 ring-primary/30 bg-base-200">
                  <Avatar theme={theme} seed={resolvedSeed} size={220} />
                </div>
                {label && (
                  <div className="font-bold text-center truncate max-w-full">
                    {label}
                  </div>
                )}
                <div className="modal-action w-full justify-center">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setExpanded(false)}
                  >
                    {t("close")}
                  </button>
                </div>
              </div>
              <div
                className="modal-backdrop bg-black/60"
                onClick={() => setExpanded(false)}
              ></div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/**
 * Anonymous avatar for anonymous bidders
 */
export function AnonymousAvatar({
  size = "sm",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={`rounded-full bg-base-content/10 flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <span className="icon-[tabler--user-question] text-base-content/40" />
    </div>
  );
}
