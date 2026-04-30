"use client";

import { useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { buildPathWithPage } from "../lib/paginationUrl";
import { signalNavigationPending } from "../lib/navigationProgress";

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
  for (let i = lo; i <= hi; i += 1) set.add(i);
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

function lastPageFromSegments(segments, serverPage, hasMore) {
  let max = serverPage;
  for (const item of segments) {
    if (item.type === "page" && item.n > max) max = item.n;
  }
  return hasMore ? max + 1 : max;
}

/**
 * Numbered pagination for server-driven ?page= with prefetch and Prev/Next.
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
    const next = Math.max(1, page);
    signalNavigationPending();
    router.push(buildPathWithPage(pathname, searchParams, next), { scroll: false });
  };

  const lastKnown = useMemo(
    () => lastPageFromSegments(segments, serverPage, hasMore),
    [segments, serverPage, hasMore]
  );

  const canGoPrev = serverPage > 1;
  const canGoNext = hasMore || serverPage < lastKnown;

  useEffect(() => {
    const hrefs = new Set();
    const add = (page) => {
      if (page < 1) return;
      hrefs.add(buildPathWithPage(pathname, searchParams, page));
    };
    add(serverPage - 1);
    add(serverPage + 1);
    add(1);
    for (const href of hrefs) {
      router.prefetch(href);
    }
  }, [pathname, searchParams, serverPage, router]);

  if (serverPage <= 1 && !hasMore) return null;

  const navClass =
    "mt-10 flex w-full max-w-full flex-wrap items-center justify-center gap-2 px-1 select-none sm:gap-3";

  const btnBase =
    "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f2323] disabled:pointer-events-none disabled:opacity-40 touch-manipulation";

  const btnIdle =
    `${btnBase} border-neutral-200 bg-white text-neutral-700 shadow-sm hover:border-[#1f2323] hover:bg-neutral-50 hover:text-[#1f2323] active:scale-95`;

  const btnNav = `${btnIdle} px-3 min-w-[5.5rem]`;

  return (
    <nav className={navClass} aria-label="Pagination">
      <button
        type="button"
        onClick={() => go(serverPage - 1)}
        disabled={!canGoPrev}
        className={btnNav}
        aria-label="Previous page"
        aria-disabled={!canGoPrev}
      >
        Prev
      </button>

      {segments.map((item) =>
        item.type === "gap" ? (
          <span
            key={item.key}
            className="flex h-11 min-w-[2rem] items-center justify-center px-1 text-sm font-medium text-neutral-400"
            aria-hidden
          >
            …
          </span>
        ) : item.n === serverPage ? (
          <span
            key={item.key}
            aria-label={`Page ${item.n}`}
            aria-current="page"
            className="flex h-11 min-w-11 shrink-0 cursor-default items-center justify-center rounded-full bg-[#1f2323] px-3 text-sm font-semibold text-white shadow-md ring-2 ring-[#1f2323]/25"
          >
            {item.n}
          </span>
        ) : (
          <button
            key={item.key}
            type="button"
            onClick={() => go(item.n)}
            aria-label={`Page ${item.n}`}
            className={`${btnIdle} h-11 w-11 px-0`}
          >
            {item.n}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => go(serverPage + 1)}
        disabled={!canGoNext}
        className={btnNav}
        aria-label="Next page"
        aria-disabled={!canGoNext}
      >
        Next
      </button>
    </nav>
  );
}
