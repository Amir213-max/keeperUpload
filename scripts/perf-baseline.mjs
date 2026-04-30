import { performance } from "node:perf_hooks";

const BASE_URL = process.env.PERF_BASE_URL || "http://localhost:3000";
const RUNS = Number(process.env.PERF_RUNS || 3);
const PERF_PRODUCTS_SLUG = (process.env.PERF_PRODUCTS_SLUG || "").trim();

const TARGETS = [
  "/",
  "/GoalkeeperGloves",
  "/GoalkeeperGloves?page=2",
  "/FootballBoots",
  "/FootballBoots?page=2",
  "/Teamsport",
  "/Sale",
  "/checkout_1",
  "/product/gk2hs",
  ...(PERF_PRODUCTS_SLUG ? [`/products/${encodeURIComponent(PERF_PRODUCTS_SLUG)}`] : []),
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
  console.log(`Perf baseline against ${BASE_URL} (runs per route: ${RUNS})`);
  const rows = [];
  for (const path of TARGETS) {
    try {
      const samples = [];
      for (let i = 0; i < RUNS; i += 1) {
        samples.push(await measurePath(path));
      }
      const ttfbValues = samples.map((r) => r.ttfb_ms).sort((a, b) => a - b);
      const totalValues = samples.map((r) => r.total_ms).sort((a, b) => a - b);
      const p95Index = Math.min(totalValues.length - 1, Math.ceil(totalValues.length * 0.95) - 1);
      rows.push({
        path,
        status: samples[0].status,
        runs: RUNS,
        ttfb_avg_ms: Number((ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length).toFixed(1)),
        total_avg_ms: Number((totalValues.reduce((a, b) => a + b, 0) / totalValues.length).toFixed(1)),
        total_best_ms: totalValues[0],
        total_p95_ms: totalValues[p95Index],
        total_worst_ms: totalValues[totalValues.length - 1],
        html_read_avg_ms: Number(
          (samples.reduce((acc, item) => acc + item.html_read_ms, 0) / samples.length).toFixed(1)
        ),
        bytes: samples[0].bytes,
      });
    } catch (error) {
      rows.push({
        path,
        status: "ERR",
        runs: RUNS,
        ttfb_avg_ms: null,
        total_avg_ms: null,
        total_best_ms: null,
        total_p95_ms: null,
        total_worst_ms: null,
        html_read_avg_ms: null,
        bytes: null,
        error: String(error?.message || error),
      });
    }
  }
  console.table(rows);
}

run();
