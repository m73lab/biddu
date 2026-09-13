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

interface WelcomeState {
  id: TourId;
  title: string;
  content: string;
  anchored: Step[];
}

/**
 * Global tour host. Each tour opens with its welcome step rendered in
 * our own centered modal (Joyride v3 can't center body-anchored steps —
 * Floating UI pins them to the page bottom). The remaining anchored
 * steps run in Joyride. Steps whose target is missing from the DOM are
 * filtered out before starting (e.g. cloud-only panels on self-hosted,
 * conditional sections).
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("tour");
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourId, setTourId] = useState<TourId | null>(null);
  const [welcome, setWelcome] = useState<WelcomeState | null>(null);

  const markSeen = useCallback((id: TourId) => {
    try {
      localStorage.setItem(tourSeenKey(id), "1");
    } catch {
      // storage unavailable: tour simply replays next visit
    }
  }, []);

  const beginAnchored = useCallback((id: TourId, anchored: Step[]) => {
    setWelcome(null);
    if (anchored.length === 0) {
      markSeen(id);
      return;
    }
    setSteps(anchored);
    setTourId(id);
    setRun(true);
  }, [markSeen]);

  const startTour = useCallback(
    (id: TourId) => {
      const defs = TOURS[id];
      const first = defs[0];
      const rest = first && first.target === "body" ? defs.slice(1) : defs;
      const anchored: Step[] = [];
      for (const d of rest) {
        if (
          typeof document === "undefined" ||
          !document.querySelector(d.target)
        ) {
          continue;
        }
        anchored.push({
          target: d.target,
          title: t(d.titleKey),
          content: t(d.contentKey),
          placement: d.placement ?? "bottom",
          skipBeacon: true,
        });
      }
      if (first && first.target === "body") {
        setTourId(id);
        setWelcome({
          id,
          title: t(first.titleKey),
          content: t(first.contentKey),
          anchored,
        });
        return;
      }
      beginAnchored(id, anchored);
    },
    [t, beginAnchored],
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
      {welcome && (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="icon-[tabler--sparkles] size-5 text-primary"></span>
              {welcome.title}
            </h3>
            <p className="py-4 text-sm text-base-content/70">
              {welcome.content}
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setWelcome(null);
                  markSeen(welcome.id);
                }}
              >
                {t("skip")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => beginAnchored(welcome.id, welcome.anchored)}
              >
                {t("start")}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop bg-black/50"
            onClick={() => {
              setWelcome(null);
              markSeen(welcome.id);
            }}
          ></div>
        </div>
      )}
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
