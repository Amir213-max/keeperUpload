# Performance Validation Guide

## Baseline commands

- `npm run build:profile`
- `npm run perf:baseline`

For local baseline collection:

1. Run production app locally:
   - `npm run build`
   - `npm run start`
2. Run baseline collector:
   - `npm run perf:baseline`
3. Optional custom host:
   - `PERF_BASE_URL=https://staging.example.com npm run perf:baseline`
4. Optional category slug listing (when set, adds `/products/{slug}` to the baseline table):
   - `PERF_PRODUCTS_SLUG=your-category-slug npm run perf:baseline`

## Tap-to-FCP and tap-to-LCP validation

`npm run perf:baseline` measures server TTFB/total for a URL fetch; it does **not** replace a real **tap-to-first-paint** trace. After navigation-related changes, validate once per release (or when touching listing/sidebar):

1. **Chrome DevTools** → **Performance** → enable **Screenshots** and **Web Vitals** (if available).
2. Set **CPU** and **Network** throttling to match your target device (e.g. **Fast 3G** + **4× slowdown** for a mid mobile profile).
3. **Record** → perform the flows below with a cold or warm cache as appropriate → **Stop**.
4. In the timeline, measure from the **Input** event (tap/click) to **FCP** and **LCP** markers for the destination route.
5. Flows to repeat:
   - Home → heavy listing (e.g. goalkeeper gloves vertical).
   - Open mobile menu → second panel → choose a subcategory or parent “show all”.
   - Listing → product detail.
6. **Network** panel (same throttle): after opening the mobile drawer, confirm a burst of `prefetch` / `_rsc` requests does not starve the **actual** navigation request when the user taps immediately (compare waterfall before vs after prefetch tuning).

Document deltas in [performance-results-mobile-nav.md](./performance-results-mobile-nav.md) or your release notes when numbers matter for a decision.

## Metrics to track after every optimization step

- Web Vitals: `LCP`, `INP`, `CLS`, `FCP`
- Server response: `TTFB`
- Route transition latency:
  - Home -> listing
  - Listing -> product
  - Cart -> checkout
- API behavior:
  - Number of GraphQL requests per action
  - p50/p95 response time for key endpoints
- Bundle:
  - Production build size and route chunks

## Validation gates (must pass before next step)

1. No broken navigation or 404 regressions.
2. No hydration/runtime errors in browser console.
3. Cart, checkout, and login flows unchanged.
4. SEO-critical pages still render expected metadata.
5. Performance KPI does not regress more than 5% on target flow.

## Rollback criteria

Rollback the latest step if any of the following happens:

- Checkout or payment flow behavior changes.
- URL/deep-link filtering behavior changes unexpectedly.
- Major visual regressions (layout shift, missing media).
- KPI degradation > 5% for two consecutive runs.

Rollback process:

1. Revert only the last optimization commit.
2. Re-run `npm run perf:baseline`.
3. Re-run smoke checks on cart/checkout/auth/listing filters.
