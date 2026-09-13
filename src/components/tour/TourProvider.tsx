import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Joyride,
  EVENTS,
  type EventData,
  type Step,
} from "react-joyride";
import { useTranslations } from "next-intl";
import { TOURS, tourSeenKey, type TourId } from "./tours";
import { TourTooltip } from "./TourTooltip";

interface TourContextValue {
  startTour: (id: TourId) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

/**
 * Global Joyride host. A single tour runs at a time; steps whose
 * target is missing from the DOM are filtered out before starting
 * (e.g. cloud-only panels on self-hosted, conditional sections).
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("tour");
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourId, setTourId] = useState<TourId | null>(null);

  const markSeen = useCallback((id: TourId) => {
    try {
      localStorage.setItem(tourSeenKey(id), "1");
    } catch {
      // storage unavailable: tour simply replays next visit
    }
  }, []);

  const startTour = useCallback(
    (id: TourId) => {
      const defs = TOURS[id];
      const built: Step[] = [];
      for (const d of defs) {
        if (
          d.target !== "body" &&
          (typeof document === "undefined" ||
            !document.querySelector(d.target))
        ) {
          continue;
        }
        built.push({
          target: d.target,
          title: t(d.titleKey),
          content: t(d.contentKey),
          placement: d.placement ?? "bottom",
          skipBeacon: true,
        });
      }
      if (built.length === 0) return;
      setSteps(built);
      setTourId(id);
      setRun(true);
    },
    [t],
  );

  const handleEvent = useCallback(
    (data: EventData) => {
      if (data.type === EVENTS.TOUR_END) {
        setRun(false);
        if (tourId) markSeen(tourId);
      }
    },
    [tourId, markSeen],
  );

  const value = useMemo(() => ({ startTour }), [startTour]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <Joyride
        run={run}
        steps={steps}
        continuous
        tooltipComponent={TourTooltip}
        onEvent={handleEvent}
        locale={{
          back: t("back"),
          close: t("skip"),
          last: t("finish"),
          next: t("next"),
          open: t("next"),
          skip: t("skip"),
        }}
      />
    </TourContext.Provider>
  );
}
