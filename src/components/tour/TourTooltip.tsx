import type { TooltipRenderProps } from "react-joyride";
import { useTranslations } from "next-intl";

/**
 * Branded tooltip (daisyUI) for guided tours.
 * Receives Joyride's button prop objects — spread them for correct behavior.
 */
export function TourTooltip({
  backProps,
  closeProps,
  continuous,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  step,
  size,
  tooltipProps,
}: TooltipRenderProps) {
  const t = useTranslations("tour");

  return (
    <div
      {...tooltipProps}
      className="card bg-base-100 shadow-2xl border border-base-content/10 max-w-xs w-72"
    >
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-bold text-primary uppercase tracking-widest">
            {t("progress", { current: index + 1, total: size })}
          </div>
          <button
            type="button"
            {...closeProps}
            className="btn btn-ghost btn-xs btn-square -mt-1 -mr-1"
          >
            <span className="icon-[tabler--x] size-4"></span>
          </button>
        </div>
        {step.title && (
          <h4 className="card-title text-base leading-tight mt-1">
            {step.title}
          </h4>
        )}
        <div className="text-sm text-base-content/70 mt-1">{step.content}</div>
        <div className="card-actions justify-between items-center mt-4">
          <button type="button" {...skipProps} className="btn btn-ghost btn-sm">
            {t("skip")}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                {...backProps}
                className="btn btn-outline btn-sm"
              >
                {t("back")}
              </button>
            )}
            {continuous && (
              <button
                type="button"
                {...primaryProps}
                className="btn btn-primary btn-sm"
              >
                {isLastStep ? t("finish") : t("next")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
