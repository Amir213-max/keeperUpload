import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapGuestLineToAddItemInput,
  getValidGuestLineInputsFromStorage,
  shouldSyncGuestCartBeforeCheckout,
  parseGuestCartOwnerUserIdFromEnv,
} from "../app/lib/guestCheckoutCartSync.pure.js";

test("mapGuestLineToAddItemInput maps productId, variantId, quantity, unitPrice", () => {
  const r = mapGuestLineToAddItemInput({
    productId: "10",
    variantId: "5",
    quantity: 2,
    unitPrice: 99,
  });
  assert.equal(r.product_id, "10");
  assert.equal(r.variant_id, "5");
  assert.equal(r.quantity, 2);
  assert.equal(r.unit_price, 99);
});

test("mapGuestLineToAddItemInput uses product nested id and product_id alias", () => {
  const r = mapGuestLineToAddItemInput({
    product: { id: "99", list_price_amount: 12.5 },
    variant_id: "7",
    quantity: 1,
  });
  assert.equal(r.product_id, "99");
  assert.equal(r.variant_id, "7");
  assert.equal(r.quantity, 1);
  assert.equal(r.unit_price, 12.5);
});

test("mapGuestLineToAddItemInput returns null without variant", () => {
  assert.equal(mapGuestLineToAddItemInput({ productId: "1", quantity: 1 }), null);
});

test("mapGuestLineToAddItemInput returns null without product", () => {
  assert.equal(mapGuestLineToAddItemInput({ variantId: "1", quantity: 1 }), null);
});

test("getValidGuestLineInputsFromStorage filters invalid lines via custom getter", () => {
  const getter = () =>
    JSON.stringify({
      lineItems: [
        { productId: "p", variantId: "v", quantity: 1, unitPrice: 10 },
        { productId: "bad" },
      ],
    });
  const lines = getValidGuestLineInputsFromStorage(getter);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].variant_id, "v");
});

test("parseGuestCartOwnerUserIdFromEnv accepts positive integer string", () => {
  assert.equal(parseGuestCartOwnerUserIdFromEnv(" 42 "), "42");
});

test("parseGuestCartOwnerUserIdFromEnv rejects empty", () => {
  assert.throws(() => parseGuestCartOwnerUserIdFromEnv(""), /NEXT_PUBLIC_GUEST_CART_USER_ID/);
  assert.throws(() => parseGuestCartOwnerUserIdFromEnv(null), /NEXT_PUBLIC_GUEST_CART_USER_ID/);
});

test("parseGuestCartOwnerUserIdFromEnv rejects non-integer", () => {
  assert.throws(() => parseGuestCartOwnerUserIdFromEnv("4b2a01b5-e4ef-4e3f-a933-be67ebde6705"));
  assert.throws(() => parseGuestCartOwnerUserIdFromEnv("3.14"));
  assert.throws(() => parseGuestCartOwnerUserIdFromEnv("0"));
});

test("shouldSyncGuestCartBeforeCheckout", () => {
  assert.equal(shouldSyncGuestCartBeforeCheckout("guest"), true);
  assert.equal(shouldSyncGuestCartBeforeCheckout("GUEST"), true);
  assert.equal(shouldSyncGuestCartBeforeCheckout(""), true);
  assert.equal(shouldSyncGuestCartBeforeCheckout(null), true);
  assert.equal(shouldSyncGuestCartBeforeCheckout(undefined), true);
  assert.equal(shouldSyncGuestCartBeforeCheckout("42"), false);
  assert.equal(shouldSyncGuestCartBeforeCheckout("  guest  "), true);
});
