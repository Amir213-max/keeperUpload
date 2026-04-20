import { graphqlClient } from "./graphqlClient";
import { ADD_ITEM_TO_CART, CREATE_CART } from "./mutations";
import {
  getValidGuestLineInputsFromStorage,
  parseGuestCartOwnerUserIdFromEnv,
} from "./guestCheckoutCartSync.pure";

export {
  mapGuestLineToAddItemInput,
  getValidGuestLineInputsFromStorage,
  shouldSyncGuestCartBeforeCheckout,
  parseGuestCartOwnerUserIdFromEnv,
} from "./guestCheckoutCartSync.pure";

/**
 * Laravel `carts.user_id` is a numeric FK to `users.id`. UUID guest tokens cannot be stored there.
 * Set NEXT_PUBLIC_GUEST_CART_USER_ID to an existing dedicated user row (e.g. a "guest_checkout" user)
 * used only for anonymous server carts. Each sync creates a new cart with reference_id tied to the
 * browser guest_id so visitors do not share one cart row.
 */
export function getGuestCartOwnerUserIdForEnv() {
  return parseGuestCartOwnerUserIdFromEnv(
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_GUEST_CART_USER_ID
      : null
  );
}

function getOrCreateBrowserGuestToken() {
  if (typeof window === "undefined") return `ssr-${Date.now()}`;
  let gid = localStorage.getItem("guest_id");
  if (!gid) {
    gid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `g-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem("guest_id", gid);
  }
  return gid;
}

/**
 * Mirrors guest_cart from localStorage into a newly created server cart, returns its id.
 * Does not use fetchUserCart with UUID user_id (incompatible with MySQL integer user_id).
 */
export async function syncGuestLocalCartToServer() {
  const addInputs = getValidGuestLineInputsFromStorage();
  if (addInputs.length === 0) {
    throw new Error(
      "Your cart is empty or items are missing size/variant. Please return to the shop and add products again."
    );
  }

  const ownerUserId = getGuestCartOwnerUserIdForEnv();
  const reference_id = `web-guest-${getOrCreateBrowserGuestToken()}`;

  const newCartRes = await graphqlClient.request(CREATE_CART, {
    input: {
      user_id: ownerUserId,
      reference_id,
      item_total: 0,
      grand_total: 0,
      shipping_costs: 0,
    },
  });

  const cartId = newCartRes?.createCart?.id;
  if (cartId == null || String(cartId).trim() === "") {
    throw new Error(
      "Could not create a checkout cart on the server. Check NEXT_PUBLIC_GUEST_CART_USER_ID and API logs."
    );
  }

  const cartIdStr = String(cartId);
  for (const partial of addInputs) {
    await graphqlClient.request(ADD_ITEM_TO_CART, {
      input: { ...partial, cart_id: cartIdStr },
    });
  }

  return { cartId };
}
