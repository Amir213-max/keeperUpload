import { performance } from "node:perf_hooks";

const BASE_URL = process.env.PERF_BASE_URL || "http://localhost:3000";
const TARGETS = [
  "/",
  "/GoalkeeperGloves",
  "/checkout_1",
  "/product/gk2hs",
];

async function measurePath(path) {
  const url = new URL(path, BASE_URL).toString();
  const startedAt = performance.now();
  const response = await fetch(url, {
    method: "GET",
    headers: { "cache-control": "no-cache" },
  });
  const ttfb = performance.now() - startedAt;
  const htmlStartedAt = performance.now();
  const html = await response.text();
  const total = performance.now() - startedAt;
  const htmlRead = performance.now() - htmlStartedAt;

  return {
    path,
    status: response.status,
    ttfb_ms: Number(ttfb.toFixed(1)),
    total_ms: Number(total.toFixed(1)),
    html_read_ms: Number(htmlRead.toFixed(1)),
    bytes: Buffer.byteLength(html, "utf8"),
  };
}

async function run() {
  console.log(`Perf baseline against ${BASE_URL}`);
  const rows = [];
  for (const path of TARGETS) {
    try {
      rows.push(await measurePath(path));
    } catch (error) {
      rows.push({
        path,
        status: "ERR",
        ttfb_ms: null,
        total_ms: null,
        html_read_ms: null,
        bytes: null,
        error: String(error?.message || error),
      });
    }
  }
  console.table(rows);
}

run();
