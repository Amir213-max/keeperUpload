/**
 * Pure helpers for `?page=` (server searchParams object or client URLSearchParams).
 * Kept separate from `categoryPageServer.js` so client components do not import Next/data-fetch modules.
 */
export function parseListingPage(searchParams) {
  const raw = searchParams?.page;
  const n = parseInt(Array.isArray(raw) ? raw[0] : String(raw ?? "1"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Client: read ?page= from Next.js `useSearchParams()` (URLSearchParams-like). */
export function parseListingPageFromUrlSearchParams(searchParams) {
  if (!searchParams || typeof searchParams.get !== "function") return 1;
  return parseListingPage({ page: searchParams.get("page") });
}
