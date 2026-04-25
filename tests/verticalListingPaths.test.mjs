import test from "node:test";
import assert from "node:assert/strict";
import { listingBasePathFromPathname } from "../app/lib/verticalListingPaths.js";

test("listingBasePathFromPathname returns base for vertical root", () => {
  assert.equal(listingBasePathFromPathname("/GoalkeeperGloves"), "/GoalkeeperGloves");
});

test("listingBasePathFromPathname returns base for filtered path", () => {
  assert.equal(
    listingBasePathFromPathname("/FootballBoots/brand-nike"),
    "/FootballBoots"
  );
});

test("listingBasePathFromPathname returns null for unrelated paths", () => {
  assert.equal(listingBasePathFromPathname("/products/gloves"), null);
  assert.equal(listingBasePathFromPathname("/"), null);
});
