import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type ConfirmModalVariant = "error" | "warning" | "primary";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const variantConfig: Record<
  ConfirmModalVariant,
  { titleClass: string; icon: string }
> = {
  error: {
    titleClass: "text-error",
    icon: "icon-[tabler--alert-octagon]",
  },
  warning: {
    titleClass: "text-warning",
    icon: "icon-[tabler--alert-triangle]",
  },
  primary: {
    titleClass: "text-primary",
    icon: "icon-[tabler--alert-circle]",
  },
};

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "error",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const t = useTranslations("common");

  if (!isOpen) return null;

  const confirm = confirmLabel || t("confirm");
  const cancel = cancelLabel || t("cancel");
  const vc = variantConfig[variant];

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3
          className={`font-bold text-lg flex items-center gap-2 ${vc.titleClass}`}
        >
          <span className={`${vc.icon} size-6`}></span>
          {title}
        </h3>

        <div className="py-4">
          {message && (
            <div className="text-sm text-base-content/70">{message}</div>
          )}
        </div>

        <div className="modal-action flex-col-reverse sm:flex-row gap-2">
          <Button
            buttonStyle="ghost"
            className="w-full sm:w-auto"
            disabled={isLoading}
            onClick={onClose}
          >
            {cancel}
          </Button>
          <Button
            variant={variant}
            className="w-full sm:w-auto"
            isLoading={isLoading}
            loadingText={t("loading")}
            onClick={onConfirm}
          >
            {confirm}
          </Button>
        </div>
      </div>
      <div
        className="modal-backdrop bg-black/50"
        onClick={() => !isLoading && onClose()}
      ></div>
    </div>
  );
}