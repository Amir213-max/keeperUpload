/**
 * Pure helpers for guest checkout cart sync (safe to import in Node tests).
 */

/**
 * Map one guest_cart line (localStorage shape) to AddCartItemInput fields (without cart_id).
 * @param {Record<string, unknown>} line
 * @returns {object | null}
 */
export function mapGuestLineToAddItemInput(line) {
  if (!line || typeof line !== "object") return null;
  const productId =
    line.productId ?? line.product_id ?? (line.product && line.product.id);
  const variantId = line.variantId ?? line.variant_id;
  if (productId == null || String(productId).trim() === "") return null;
  if (variantId == null || String(variantId).trim() === "") return null;
  const quantity = Math.max(1, parseInt(String(line.quantity), 10) || 1);
  const unit = Number(
    line.unitPrice ??
      line.price ??
      (line.product && line.product.list_price_amount) ??
      (line.product && line.product.price_range_exact_amount) ??
      0
  );
  const input = {
    product_id: String(productId),
    variant_id: String(variantId),
    quantity,
  };
  if (Number.isFinite(unit) && unit > 0) {
    input.unit_price = unit;
  }
  return input;
}

/**
 * Read guest_cart JSON and return valid add-item payloads (no cart_id).
 * @param {() => string | null} [getItem] for tests
 */
export function getValidGuestLineInputsFromStorage(getItem = null) {
  const read =
    getItem ||
    (typeof window !== "undefined"
      ? (k) => localStorage.getItem(k)
      : () => null);
  const rawJson = read("guest_cart");
  if (!rawJson) return [];
  let raw;
  try {
    raw = JSON.parse(rawJson);
  } catch {
    return [];
  }
  const lines = raw?.lineItems;
  if (!Array.isArray(lines)) return [];
  const out = [];
  for (const line of lines) {
    const mapped = mapGuestLineToAddItemInput(line);
    if (mapped) out.push(mapped);
  }
  return out;
}

/**
 * @param {string | null | undefined} cartIdFromUrl
 * @returns {boolean}
 */
export function shouldSyncGuestCartBeforeCheckout(cartIdFromUrl) {
  const s = cartIdFromUrl == null ? "" : String(cartIdFromUrl).trim();
  if (!s) return true;
  return s.toLowerCase() === "guest";
}

/**
 * Validates NEXT_PUBLIC_GUEST_CART_USER_ID style value (numeric users.id for Laravel carts.user_id).
 * @param {string | null | undefined} envValue
 * @returns {string}
 */
export function parseGuestCartOwnerUserIdFromEnv(envValue) {
  if (envValue == null || String(envValue).trim() === "") {
    throw new Error(
      "Guest checkout: add NEXT_PUBLIC_GUEST_CART_USER_ID to .env.local (a dedicated numeric users.id from your database)."
    );
  }
  const n = Number(String(envValue).trim());
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error(
      "Guest checkout: NEXT_PUBLIC_GUEST_CART_USER_ID must be a positive integer (existing users.id)."
    );
  }
  return String(n);
}
