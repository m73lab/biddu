import { useEffect, useState, type ReactNode } from "react";

/**
 * Live countdown shown only inside the final window before the end.
 * Below the threshold it ticks every second (MM:SS); otherwise it
 * renders `children` untouched (the regular formatted date).
 * SSR-safe: static until mounted, so server and client match.
 */
export const COUNTDOWN_THRESHOLD_MS = 10 * 60 * 1000;

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface CountdownProps {
  /** ISO date string. Null/invalid renders children as-is. */
  target: string | null;
  children: ReactNode;
  className?: string;
}

export function Countdown({ target, children, className = "" }: CountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;
    const targetMs = new Date(target).getTime();
    if (Number.isNaN(targetMs)) return;
    if (targetMs - Date.now() > COUNTDOWN_THRESHOLD_MS) return;
    const tick = () => setNow(Date.now());
    const boot = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(boot);
      clearInterval(id);
    };
  }, [target]);

  if (target && now !== null) {
    const remaining = new Date(target).getTime() - now;
    if (!Number.isNaN(remaining) && remaining > 0 && remaining <= COUNTDOWN_THRESHOLD_MS) {
      return (
        <span
          role="timer"
          className={`font-mono font-bold text-error tabular-nums ${className}`}
        >
          {formatCountdown(remaining)}
        </span>
      );
    }
  }

  return <>{children}</>;
}
