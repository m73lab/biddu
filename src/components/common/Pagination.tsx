import { useTranslations } from "next-intl";
import { PAGE_SIZES } from "@/lib/api/pagination";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Generic client-side pager (same pattern as admin lists, but with
 * shared `common`/`pagination` strings so it works outside admin).
 * Paging itself is server-driven: parents navigate or refetch.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const t = useTranslations("pagination");
  const tCommon = useTranslations("common");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-2 pb-2">
      <div className="flex items-center gap-2 text-sm text-base-content/60">
        <span>{t("perPage")}</span>
        <select
          className="select select-sm select-bordered"
          value={pageSize}
          onChange={(e) => {
            const size = parseInt(e.target.value, 10);
            onPageSizeChange(
              (PAGE_SIZES as readonly number[]).includes(size) ? size : 10,
            );
          }}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span>{t("totalRows", { count: total })}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-sm btn-ghost"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <span className="icon-[tabler--chevron-left] size-4"></span>
          {tCommon("previous")}
        </button>
        <span className="text-sm text-base-content/60 px-1">
          {t("pageLabel", { current: page, count: totalPages })}
        </span>
        <button
          className="btn btn-sm btn-ghost"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {tCommon("next")}
          <span className="icon-[tabler--chevron-right] size-4"></span>
        </button>
      </div>
    </div>
  );
}
