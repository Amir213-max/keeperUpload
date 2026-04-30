# Mobile Navigation Performance Results

## Environment
- Date: 2026-04-22
- Base URL: `http://localhost:3010`
- Command: `npm run perf:baseline`
- Scope: Server/page delivery baseline used as before/after reference while optimizing mobile sidebar navigation path.

## Before vs After

| Path | TTFB Before (ms) | TTFB After (ms) | Delta |
| --- | ---: | ---: | ---: |
| `/` | 149.3 | 126.4 | -22.9 |
| `/GoalkeeperGloves` | 9442.3 | 3395.5 | -6046.8 |
| `/checkout_1` | 4.4 | 4.5 | +0.1 |
| `/product/gk2hs` | 410.1 | 445.5 | +35.4 |

| Path | Total Before (ms) | Total After (ms) | Delta |
| --- | ---: | ---: | ---: |
| `/` | 153.0 | 130.0 | -23.0 |
| `/GoalkeeperGloves` | 9451.9 | 3407.0 | -6044.9 |
| `/checkout_1` | 5.0 | 5.5 | +0.5 |
| `/product/gk2hs` | 414.4 | 452.5 | +38.1 |

## Notes
- The largest improvement appears on `/GoalkeeperGloves`, which is the main mobile menu destination.
- These numbers are network/server timing baselines and not direct tap-to-paint client interaction metrics.
- Client-side mobile interaction should still be manually profiled in DevTools Performance using the same device/throttle profile for strict click-to-render latency comparison.

## Latest Tuning Pass (Mobile Menu Path + Goalkeeper Route)

- Additional changes:
  - Removed `DynamicText` usage from sidebar menu rendering path and used local name selection by current language.
  - Added targeted prefetch for parent panel subcategory routes when the second panel opens.
  - Added route-level revalidation (`revalidate = 120`) to Goalkeeper listing pages.
  - Reduced facet aggregation work for Goalkeeper listing (`maxPages: 1`) to lower server response time.

### Latest baseline snapshot

| Path | TTFB (ms) | Total (ms) |
| --- | ---: | ---: |
| `/` | 93.7 | 97.3 |
| `/GoalkeeperGloves` | 4631.6 | 4665.3 |
| `/checkout_1` | 8.5 | 10.7 |
| `/product/gk2hs` | 441.4 | 468.4 |

### Observation

- `/GoalkeeperGloves` is still the dominant bottleneck, but it improved versus the worst baseline.
- Remaining latency is mostly server/data cost on the destination page, not just client click handler overhead.

## Instant Mobile Navigation Pass

- Baseline before this pass:
  - `/` -> `ttfb_ms: 107.9`, `total_ms: 117.1`
  - `/GoalkeeperGloves` -> `ttfb_ms: 7127.9`, `total_ms: 7146.3`
  - `/checkout_1` -> `ttfb_ms: 7.8`, `total_ms: 8.6`
  - `/product/gk2hs` -> `ttfb_ms: 404.8`, `total_ms: 411.2`
- After applying:
  - facets optimization (`maxPages: 1`) + route `revalidate` on heavy vertical pages
  - lighter facet loop query
  - reduced mobile prefetch contention
  - reduced image-gating delay in category client pages

### Before vs After (Instant Pass)

| Path | TTFB Before (ms) | TTFB After (ms) | Delta |
| --- | ---: | ---: | ---: |
| `/` | 107.9 | 42.4 | -65.5 |
| `/GoalkeeperGloves` | 7127.9 | 2878.6 | -4249.3 |
| `/checkout_1` | 7.8 | 3.4 | -4.4 |
| `/product/gk2hs` | 404.8 | 398.8 | -6.0 |

| Path | Total Before (ms) | Total After (ms) | Delta |
| --- | ---: | ---: | ---: |
| `/` | 117.1 | 46.0 | -71.1 |
| `/GoalkeeperGloves` | 7146.3 | 2889.8 | -4256.5 |
| `/checkout_1` | 8.6 | 4.0 | -4.6 |
| `/product/gk2hs` | 411.2 | 404.1 | -7.1 |

### Conclusion

- The dominant bottleneck route `/GoalkeeperGloves` improved strongly in both TTFB and total time.
- Mobile tap-to-navigation perception should be better because first content is no longer blocked as long by image-gating.
- For strict UX timing (`tap_to_url` and `tap_to_fcp`), run one DevTools mobile trace set under identical throttle/profile (step-by-step: [performance-validation.md](./performance-validation.md#tap-to-fcp-and-tap-to-lcp-validation)).
- `/products/[slug]` listing routes use `revalidate = 120` and lighter facet fetches (`maxPages: 1`); measure with `PERF_PRODUCTS_SLUG` (see [performance-validation.md](./performance-validation.md)).
