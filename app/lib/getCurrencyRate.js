import { graphqlClient } from "./graphqlClient";

/** Approximate EUR→SAR when backend has no public setting (ECB-style ballpark). */
const DEFAULT_EUR_TO_SAR =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_EUR_TO_SAR_FALLBACK
    ? parseFloat(process.env.NEXT_PUBLIC_EUR_TO_SAR_FALLBACK)
    : 4.6;

const KEY_CANDIDATES = [
  "eur_to_sar",
  "EUR_TO_SAR",
  "eur-to-sar",
  "exchange_rate_eur_sar",
];

function pickRateFromSettings(publicSettings) {
  if (!Array.isArray(publicSettings) || publicSettings.length === 0) {
    return null;
  }

  for (const key of KEY_CANDIDATES) {
    const found = publicSettings.find(
      (s) => String(s.key || "").toLowerCase() === key.toLowerCase()
    );
    if (found?.value != null && String(found.value).trim() !== "") {
      const rate = parseFloat(String(found.value).trim());
      if (!Number.isNaN(rate) && rate > 0) {
        return rate;
      }
    }
  }

  return null;
}

/**
 * EUR → SAR rate from GraphQL publicSettings.
 * Never throws: missing/invalid API or keys falls back to DEFAULT_EUR_TO_SAR.
 */
export async function getCurrencyRate() {
  const query = `
    query {
      publicSettings {
        key
        value
      }
    }
  `;

  try {
    const res = await graphqlClient.request(query);
    const rate = pickRateFromSettings(res?.publicSettings);

    if (rate != null) {
      return rate;
    }

    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[getCurrencyRate] No usable EUR→SAR key in publicSettings. Keys:",
        res?.publicSettings?.map((s) => s.key).filter(Boolean).slice(0, 30)
      );
    }

    return Number.isFinite(DEFAULT_EUR_TO_SAR) && DEFAULT_EUR_TO_SAR > 0
      ? DEFAULT_EUR_TO_SAR
      : 4.6;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getCurrencyRate] GraphQL failed, using fallback:", error?.message);
    }
    return Number.isFinite(DEFAULT_EUR_TO_SAR) && DEFAULT_EUR_TO_SAR > 0
      ? DEFAULT_EUR_TO_SAR
      : 4.6;
  }
}
