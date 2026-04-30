/**
 * Fired before programmatic `router.push` / `router.replace` so ProgressBar
 * can mirror the same pending state as internal `<a href>` clicks.
 */
export const KEEPER_NAV_PENDING = "keeper:nav-pending";

export function signalNavigationPending() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(KEEPER_NAV_PENDING));
}
