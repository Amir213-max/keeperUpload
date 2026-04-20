"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { PUBLIC_SETTINGS_NAV_QUERY } from "../lib/queries";
import { getSiteLogoUrlOrFallback } from "../lib/siteLogoFromSettings";

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
        const data = await graphqlRequest(PUBLIC_SETTINGS_NAV_QUERY);
        if (cancelled) return;
        const all = data?.publicSettings || [];
        const offers = all.find((s) => s.group && String(s.group).toLowerCase() === "offers_label");
        if (offers) setOffersLabel(offers);
        setSiteLogoUrl(getSiteLogoUrlOrFallback(all));
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
