/** Next.js 15 may pass searchParams as a Promise on async pages. */
export async function resolveSearchParams(searchParams) {
  if (searchParams != null && typeof searchParams.then === "function") {
    return searchParams;
  }
  return searchParams ?? {};
}

/**
 * Append or remove ?page= for Next.js App Router navigation (preserves other query params).
 */
export function buildPathWithPage(pathname, searchParams, page) {
  const p = new URLSearchParams(
    typeof searchParams?.toString === "function" ? searchParams.toString() : ""
  );
  if (page <= 1) {
    p.delete("page");
  } else {
    p.set("page", String(page));
  }
  const q = p.toString();
  return q ? `${pathname}?${q}` : pathname;
}
