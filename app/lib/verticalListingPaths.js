/** Base paths that support brand segments from the mobile menu (navbar verticals). */
export const LISTING_BASE_PATHS = [
  "/GoalkeeperGloves",
  "/FootballBoots",
  "/Goalkeeperapparel",
  "/Goalkeeperequipment",
  "/Teamsport",
  "/Sale",
];

export function listingBasePathFromPathname(path) {
  if (!path || typeof path !== "string") return null;
  for (const base of LISTING_BASE_PATHS) {
    if (path === base || path.startsWith(`${base}/`)) return base;
  }
  return null;
}
