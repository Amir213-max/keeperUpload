import test from "node:test";
import assert from "node:assert/strict";
import { buildPathWithPage } from "../app/lib/paginationUrl.js";

test("buildPathWithPage preserves other query params when setting page", () => {
  const pathname = "/GoalkeeperGloves";
  const params = new URLSearchParams("brand=Nike&attr_Size=M%2CL");
  const withPage2 = buildPathWithPage(pathname, params, 2);
  assert.equal(withPage2.includes("page=2"), true);
  assert.equal(withPage2.includes("brand=Nike"), true);
  assert.match(withPage2, /attr_Size=/);
});

test("buildPathWithPage removes page when going to page 1", () => {
  const pathname = "/FootballBoots";
  const params = new URLSearchParams("page=3&brand=Adidas");
  const back = buildPathWithPage(pathname, params, 1);
  assert.equal(back.includes("page="), false);
  assert.equal(back.includes("brand=Adidas"), true);
});

test("buildPathWithPage returns pathname only when no query", () => {
  const pathname = "/Sale";
  const params = new URLSearchParams("");
  assert.equal(buildPathWithPage(pathname, params, 1), pathname);
});
