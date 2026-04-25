import test from "node:test";
import assert from "node:assert/strict";
import { LISTING_PAGE_SIZE } from "../app/lib/listingConfig.js";
import {
  parseListingPage,
  parseListingPageFromUrlSearchParams,
} from "../app/lib/listingPageParse.js";

test("parseListingPage: page 2 gives offset 40 with LISTING_PAGE_SIZE", () => {
  const page = parseListingPage({ page: "2" });
  assert.equal(page, 2);
  assert.equal((page - 1) * LISTING_PAGE_SIZE, 40);
});

test("parseListingPageFromUrlSearchParams reads URLSearchParams", () => {
  const sp = new URLSearchParams("page=3");
  assert.ok(sp.has("page"));
  assert.equal(parseListingPageFromUrlSearchParams(sp), 3);
});

test("parseListingPage: invalid falls back to 1", () => {
  assert.equal(parseListingPage({ page: "0" }), 1);
  assert.equal(parseListingPage({ page: "abc" }), 1);
});
