# Performance Baseline (Pre-Optimization)

Date: 2026-04-29  
Environment: local (`http://localhost:3000`)

## HTTP Baseline (`npm run perf:baseline`)

- `/`: status `200`, avg total `202.6ms`, bytes `40,888`
- `/GoalkeeperGloves`: status `200`, avg total `8272.5ms`, bytes `569,003`
- `/GoalkeeperGloves?page=2`: status `200`, avg total `4934.2ms`, bytes `558,627`
- Failed in baseline run: `/FootballBoots`, `/FootballBoots?page=2`, `/Teamsport`, `/Sale`, `/checkout_1`, `/product/gk2hs` (fetch failed during script run)

## Build Snapshot (`npm run build:profile`)

- Home first-load JS: `238 kB`
- Blogs first-load JS: `187 kB`
- Blog detail first-load JS: `152 kB`
- Product detail first-load JS: `216 kB`
- Listing pages first-load JS around: `272-273 kB`
- Shared JS by all routes: `105 kB`
- Middleware bundle: `34.4 kB`

## Notes

- PSI production runs should be captured after deployment for:
  - `/`
  - representative listing page
  - representative product page
  - `/blogs`
  - representative blog detail page

## Post-Optimization Build Snapshot

From `npm run build` / `npm run analyze`:

- Home first-load JS: `235 kB` (was `238 kB`)
- Blogs first-load JS: `158 kB` (was `187 kB`)
- Blog detail first-load JS: `123 kB` (was `152 kB`)
- Product detail first-load JS: `213 kB` (was `216 kB`)
- Shared JS by all routes: `102 kB` (was `105 kB`)

Bundle analyzer reports generated:

- `.next/analyze/client.html`
- `.next/analyze/nodejs.html`
- `.next/analyze/edge.html`

## Post-Optimization HTTP Check

Second `npm run perf:baseline` run returned many `404` responses for listing/product routes, indicating the local server used during that run did not expose expected dynamic routes. Keep this run as transport sanity only; use production/staging URL for final PSI comparison.
