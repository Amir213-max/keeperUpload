"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { PUBLIC_SETTINGS_NAV_QUERY } from "../lib/queries";
import { pickSiteLogoUrl } from "../lib/siteLogoFromSettings";

const PUBLIC_NAV_CACHE_KEY = "public_nav_settings_v1";
const PUBLIC_NAV_CACHE_TTL_MS = 10 * 60 * 1000;

const PublicNavSettingsContext = createContext({
  siteLogoUrl: null,
  offersLabel: null,
  ready: false,
});

export function PublicNavSettingsProvider({ children }) {
  const [siteLogoUrl, setSiteLogoUrl] = useState(null);
  const [offersLabel, setOffersLabel] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          const raw = sessionStorage.getItem(PUBLIC_NAV_CACHE_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.ts && Date.now() - parsed.ts < PUBLIC_NAV_CACHE_TTL_MS) {
                const all = parsed.data || [];
                const offers = all.find((s) => s.group && String(s.group).toLowerCase() === "offers_label");
                if (offers) setOffersLabel(offers);
                setSiteLogoUrl(pickSiteLogoUrl(all));
                return;
              }
            } catch {
              sessionStorage.removeItem(PUBLIC_NAV_CACHE_KEY);
            }
          }
        }
        const data = await graphqlRequest(PUBLIC_SETTINGS_NAV_QUERY);
        if (cancelled) return;
        const all = data?.publicSettings || [];
        const offers = all.find((s) => s.group && String(s.group).toLowerCase() === "offers_label");
        if (offers) setOffersLabel(offers);
        setSiteLogoUrl(pickSiteLogoUrl(all));
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            PUBLIC_NAV_CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data: all })
          );
        }
      } catch (e) {
        console.error("PublicNavSettings: failed to load publicSettings", e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ siteLogoUrl, offersLabel, ready }),
    [siteLogoUrl, offersLabel, ready]
  );

  return (
    <PublicNavSettingsContext.Provider value={value}>
      {children}
    </PublicNavSettingsContext.Provider>
  );
}

export function usePublicNavSettings() {
  return useContext(PublicNavSettingsContext);
}
