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
