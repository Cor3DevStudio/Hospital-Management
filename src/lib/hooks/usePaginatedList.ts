import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 50;

export function usePaginatedList<T>(
  items: T[],
  pageSize = DEFAULT_PAGE_SIZE
): {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageItems: T[];
  setPage: (page: number) => void;
  resetPage: () => void;
} {
  const [page, setPageRaw] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPage = (next: number) => {
    setPageRaw(Math.max(1, Math.min(next, totalPages)));
  };

  const resetPage = () => setPageRaw(1);

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalItems,
    pageItems,
    setPage,
    resetPage,
  };
}

/** Resets page to 1 when filter inputs change. */
export function useResetPageOnChange(resetPage: () => void, deps: unknown[]): void {
  useEffect(() => {
    resetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
