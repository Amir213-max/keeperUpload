/**
 * Client-side helpers for category-scoped product slices (via /api/graphql proxy).
 * Uses Query.productsWithFilters — never min_price / max_price.
 */

import { graphqlRequest } from "./graphqlClientHelper";
import { GET_CATEGORIES_ONLY_QUERY, PRODUCTS_WITH_FILTERS_LISTING_QUERY } from "./queries";
import { findRootCategoryBySlug } from "./categoryResolve";
import { promoSliderListingConfig, verticalListingConfig } from "./categoryListingSlugs";
import { buildProductFilters } from "./productFilters";

const CLIENT_CATEGORIES_CACHE_TTL_MS = 60 * 1000;
let cachedCategoriesPayload = null;
let cachedCategoriesPromise = null;

async function getClientRootCategories() {
  const now = Date.now();
  if (
    cachedCategoriesPayload &&
    now - cachedCategoriesPayload.ts < CLIENT_CATEGORIES_CACHE_TTL_MS &&
    Array.isArray(cachedCategoriesPayload.rootCategories)
  ) {
    return cachedCategoriesPayload.rootCategories;
  }

  if (!cachedCategoriesPromise) {
    cachedCategoriesPromise = graphqlRequest(GET_CATEGORIES_ONLY_QUERY)
      .then((cats) => {
        const rootCategories = cats.rootCategories || [];
        cachedCategoriesPayload = { ts: Date.now(), rootCategories };
        return rootCategories;
      })
      .finally(() => {
        cachedCategoriesPromise = null;
      });
  }

  return cachedCategoriesPromise;
}

/**
 * @param {'glovesCollection'|'studsCollection'|'trainingAids'} sliderKey
 * @param {{ limit?: number }} [opts]
 */
export async function fetchPromoSliderProducts(sliderKey, opts = {}) {
  const limit = opts.limit ?? 10;
  const cfg = promoSliderListingConfig[sliderKey];
  if (!cfg) {
    console.warn("fetchPromoSliderProducts: unknown key", sliderKey);
    return [];
  }

  const rootCategories = await getClientRootCategories();
  let cat = findRootCategoryBySlug(rootCategories, cfg.slug);
  if (!cat && cfg.legacyRootCategoryIds?.length) {
    const idSet = new Set(cfg.legacyRootCategoryIds.map(String));
    cat = rootCategories.find((c) => idSet.has(String(c.id))) || null;
  }
  if (!cat) return [];

  const filters = buildProductFilters({ categoryId: cat.id });
  const data = await graphqlRequest(PRODUCTS_WITH_FILTERS_LISTING_QUERY, {
    categoryId: cat.id,
    filters,
    limit,
    offset: 0,
  });
  return (data.productsWithFilters || []).slice(0, limit);
}

/**
 * Client: products for a vertical (e.g. sidebar brand extraction).
 * @param {keyof typeof verticalListingConfig} verticalKey
 */
export async function fetchClientProductsByVertical(verticalKey, opts = {}) {
  const limit = opts.limit ?? 48;
  const offset = opts.offset ?? 0;
  const cfg = verticalListingConfig[verticalKey];
  if (!cfg) {
    console.warn("fetchClientProductsByVertical: unknown key", verticalKey);
    return [];
  }

  const rootCategories = await getClientRootCategories();
  let cat = findRootCategoryBySlug(rootCategories, cfg.slug);
  if (!cat && cfg.legacyRootCategoryIds?.length) {
    const idSet = new Set(cfg.legacyRootCategoryIds.map(String));
    cat = rootCategories.find((c) => idSet.has(String(c.id))) || null;
  }
  if (!cat) return [];

  const filters = buildProductFilters({ categoryId: cat.id });
  const data = await graphqlRequest(PRODUCTS_WITH_FILTERS_LISTING_QUERY, {
    categoryId: cat.id,
    filters,
    limit,
    offset,
  });
  return data.productsWithFilters || [];
}
