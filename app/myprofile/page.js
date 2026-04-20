import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function toQueryString(searchParams) {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)));
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

/**
 * Legacy route: `/myprofile` → unified account page at `/profile`.
 * Preserves query string (e.g. `?tab=orders`) for deep links.
 */
export default async function MyProfileRedirectPage({ searchParams }) {
  const resolved = await searchParams;
  const q = toQueryString(resolved);
  redirect(q ? `/profile?${q}` : "/profile");
}
