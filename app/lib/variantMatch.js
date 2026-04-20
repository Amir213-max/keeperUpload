/**
 * Helpers for matching UI-selected attributes (e.g. Size) to ProductVariant rows.
 * Tolerant to missing stock/size from API — callers should always fall back.
 */

/** Stable merge key for guest cart lines (product + optional variant). */
export function guestCartLineKey(productId, variantId) {
  return `${productId}::${variantId ?? "base"}`;
}

export function normalizeSizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Attribute label is treated as "size" for UI and cart matching (EN/AR/FR). */
export function isSizeLikeAttributeLabel(label) {
  const s = String(label ?? "").toLowerCase();
  if (!s) return false;
  if (s.includes("size")) return true;
  if (s.includes("مقاس")) return true;
  if (s.includes("taille")) return true;
  return false;
}

/**
 * First numeric token in a size string (e.g. "EU 42", "6.5 UK", "39") for ordering.
 * @param {string} value
 * @returns {number}
 */
function primaryNumericFromSizeOption(value) {
  const str = String(value ?? "").trim();
  const m = str.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return Number.NaN;
  return parseFloat(m[1].replace(",", "."), 10);
}

/**
 * Sort size option labels ascending (smallest → largest) when parseable; else locale order.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareSizeOptionValues(a, b) {
  const na = primaryNumericFromSizeOption(a);
  const nb = primaryNumericFromSizeOption(b);
  const aOk = !Number.isNaN(na);
  const bOk = !Number.isNaN(nb);
  if (aOk && bOk && na !== nb) return na - nb;
  if (aOk && !bOk) return -1;
  if (!aOk && bOk) return 1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** @param {string[]} values */
export function sortSizeOptionValues(values) {
  if (!Array.isArray(values)) return [];
  return [...values].sort(compareSizeOptionValues);
}

/** True if any variant exposes a non-empty `size` (needs explicit size pick in modal/PDP). */
export function variantsHaveSizeOnStock(variants) {
  if (!Array.isArray(variants)) return false;
  return variants.some((v) => String(v?.size ?? "").trim().length > 0);
}

/**
 * @param {Array<{ size?: string, name?: string }>} variants
 * @param {Record<string, string>} selectedAttributes label -> selected key/value
 * @returns {object | null} variant or null
 */
export function findVariantBySelectedSize(variants, selectedAttributes) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const entries = Object.entries(selectedAttributes || {});
  const sizeEntry = entries.find(([label]) => isSizeLikeAttributeLabel(label));
  if (!sizeEntry) return null;
  const selectedVal = normalizeSizeToken(sizeEntry[1]);
  if (!selectedVal) return null;

  for (const v of variants) {
    const vs = normalizeSizeToken(v?.size);
    if (vs && vs === selectedVal) return v;
    const vn = normalizeSizeToken(v?.name);
    if (vn && vn === selectedVal) return v;
  }
  return null;
}

/** Max selectable quantity for UI (1–99), from variant.stock.qty / maxQty when present. */
export function getVariantQuantityCap(variant) {
  if (!variant?.stock || typeof variant.stock !== "object") return 10;
  const { qty, maxQty } = variant.stock;
  const hasQty = typeof qty === "number" && qty >= 0;
  const hasMax = typeof maxQty === "number" && maxQty > 0;
  if (!hasQty && !hasMax) return 10;
  let cap = 99;
  if (hasQty) cap = Math.min(cap, qty);
  if (hasMax) cap = Math.min(cap, maxQty);
  return Math.max(1, Math.min(cap, 99));
}

export function isVariantPurchasable(variant) {
  if (!variant) return false;
  const s = variant.stock || {};
  if (s.isInStock === false) return false;
  const qty = s.qty;
  if (typeof qty === "number" && qty <= 0) return false;
  return true;
}

/**
 * Resolve variant for a single size option value (button label).
 */
export function findVariantForSizeValue(variants, value) {
  if (!Array.isArray(variants)) return null;
  const token = normalizeSizeToken(value);
  for (const v of variants) {
    if (normalizeSizeToken(v?.size) === token) return v;
    if (normalizeSizeToken(v?.name) === token) return v;
  }
  return null;
}
