import { useEffect } from "react";
import { useTourContext } from "./TourProvider";
import { tourSeenKey, type TourId } from "./tours";

/**
 * Auto-start a tour once per browser (localStorage flag, versioned).
 * Returns a restart function for help buttons.
 * Pass `disabled: true` to skip the auto-start (e.g. the bidding tour
 * makes no sense for the item owner, who can't bid on their own item).
 * Manual restart via help buttons keeps working.
 */
export function useTour(id: TourId, opts?: { disabled?: boolean }) {
  const { startTour } = useTourContext();
  const disabled = opts?.disabled ?? false;

  useEffect(() => {
    if (disabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!localStorage.getItem(tourSeenKey(id))) {
        timer = setTimeout(() => startTour(id), 900);
      }
    } catch {
      // storage unavailable: never auto-start
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [id, startTour, disabled]);

  return {
    restartTour: () => startTour(id),
  };
}
