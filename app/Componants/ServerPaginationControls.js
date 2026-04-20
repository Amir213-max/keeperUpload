"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { buildPathWithPage } from "../lib/paginationUrl";

/**
 * Build sorted unique page numbers around current page (no total count from API).
 * When hasMore is false, `serverPage` is treated as the last page.
 */
function buildPageNumbers(serverPage, hasMore, siblingCount = 2) {
  const p = Math.max(1, serverPage);
  const set = new Set();
  set.add(1);
  const lo = Math.max(1, p - siblingCount);
  const hi = hasMore ? p + siblingCount : p;
  for (let i = lo; i <= hi; i++) set.add(i);
  return Array.from(set).sort((a, b) => a - b);
}

function toSegments(sorted) {
  const out = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev > 0 && n - prev > 1) {
      out.push({ type: "gap", key: `gap-${prev}-${n}` });
    }
    out.push({ type: "page", n, key: `p-${n}` });
    prev = n;
  }
  return out;
}

/**
 * Numbered circular pagination for server-driven ?page= (no Prev/Next).
 */
export default function ServerPaginationControls({ serverPage = 1, hasMore = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const segments = useMemo(
    () => toSegments(buildPageNumbers(serverPage, hasMore, 2)),
    [serverPage, hasMore]
  );

  const go = (page) => {
    router.push(buildPathWithPage(pathname, searchParams, page));
  };

  if (serverPage <= 1 && !hasMore) return null;

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-2 select-none"
      aria-label="Pagination"
    >
      {segments.map((item) =>
        item.type === "gap" ? (
          <span
            key={item.key}
            className="flex h-10 min-w-[2rem] items-center justify-center px-1 text-sm font-medium text-neutral-400"
            aria-hidden
          >
            …
          </span>
        ) : item.n === serverPage ? (
          <span
            key={item.key}
            aria-label={`Page ${item.n}`}
            aria-current="page"
            className="flex h-11 w-11 shrink-0 cursor-default items-center justify-center rounded-full bg-[#1f2323] text-sm font-semibold text-white shadow-md ring-2 ring-[#1f2323]/25"
          >
            {item.n}
          </span>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={() => go(item.n)}
            aria-label={`Page ${item.n}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-semibold text-neutral-700 shadow-sm transition-all duration-200 hover:border-[#1f2323] hover:bg-neutral-50 hover:text-[#1f2323] active:scale-95"
          >
            {item.n}
          </button>
        )
      )}
    </nav>
  );
}
