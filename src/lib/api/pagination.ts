/**
 * Shared server-side pagination for admin list endpoints.
 */
export const PAGE_SIZES = [5, 10, 15, 30] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;

export interface PaginationParams {
  page: number;
  pageSize: PageSize;
  skip: number;
  take: number;
}

export function parsePagination(
  query: Record<string, string | string[] | undefined>,
): PaginationParams {
  const rawPage = Array.isArray(query.page) ? query.page[0] : query.page;
  const rawSize = Array.isArray(query.pageSize) ? query.pageSize[0] : query.pageSize;
  const page = Math.max(1, parseInt(rawPage || "", 10) || 1);
  const requested = parseInt(rawSize || "", 10) || DEFAULT_PAGE_SIZE;
  const pageSize = (PAGE_SIZES as readonly number[]).includes(requested)
    ? (requested as PageSize)
    : DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}