/**
 * UserAvatar - Deterministic generated avatar (Avatune, yanliu theme)
 *
 * Same seed always renders the same face: pass the stable user id as
 * `seed` so the avatar never changes. Falls back to email, then name.
 */

import { Avatar } from "@avatune/react";
import theme from "@avatune/yanliu-theme/react";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  /** Stable identifier (user id). Preferred seed; falls back to email/name. */
  seed?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const sizePx = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
};

export function UserAvatar({
  name,
  email,
  seed,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const resolvedSeed = seed || email || name || "biddu";

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 ring-2 ring-primary/20 bg-base-200 ${sizeClasses[size]} ${className}`}
      title={name || email || undefined}
    >
      <Avatar theme={theme} seed={resolvedSeed} size={sizePx[size]} />
    </div>
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
