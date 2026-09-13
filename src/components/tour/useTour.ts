import { useEffect } from "react";
import { useTourContext } from "./TourProvider";
import { tourSeenKey, type TourId } from "./tours";

/**
 * Auto-start a tour once per browser (localStorage flag, versioned).
 * Returns a restart function for help buttons.
 */
export function useTour(id: TourId) {
  const { startTour } = useTourContext();

  useEffect(() => {
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
  }, [id, startTour]);

  return {
    restartTour: () => startTour(id),
  };
}
