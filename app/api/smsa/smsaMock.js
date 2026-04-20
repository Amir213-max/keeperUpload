/**
 * Dev / pre-go-live: simulate SMSA rates and shipment creation.
 * Set SMSA_MOCK=false (or remove) when the real SMSA key and endpoints work.
 */
export function isSmsaMock() {
  const v = process.env.SMSA_MOCK?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function numEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Simulated shipping cost (SAR) for checkout tests */
export function getMockSmsaShippingCost(countryCode, type) {
  const cc = String(countryCode || "SA").toUpperCase();
  const fast = type === "fast";
  if (cc === "SA") {
    return fast
      ? numEnv("SMSA_MOCK_COST_SA_FAST", 45)
      : numEnv("SMSA_MOCK_COST_SA_NORMAL", 25);
  }
  return fast
    ? numEnv("SMSA_MOCK_COST_INTL_FAST", 120)
    : numEnv("SMSA_MOCK_COST_INTL_NORMAL", 80);
}
