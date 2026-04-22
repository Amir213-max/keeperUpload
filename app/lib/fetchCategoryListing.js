import { graphqlClient } from "./graphqlClient";
import {
  GET_CATEGORIES_ONLY_QUERY,
  PRODUCTS_WITH_FILTERS_LISTING_QUERY,
  PRODUCTS_WITH_FILTERS_QUERY,
} from "./queries";
import { buildProductFilters } from "./productFilters";
import { findCategoryBySlugForListing } from "./categoryResolve";
import { verticalListingConfig } from "./categoryListingSlugs";
import { LISTING_PAGE_SIZE } from "./listingConfig";
import { buildListingAttributeFacetsFromProducts } from "./buildListingAttributeFacets";

/**
 * Default page size for category listing (Query.productsWithFilters limit).
 * Schema does not return total count on this query — use hasMore (length === limit).
 */
export const DEFAULT_CATEGORY_PAGE_SIZE = LISTING_PAGE_SIZE;

/**
 * Fetch products for a category via Query.productsWithFilters + Query.rootCategory (metadata).
 *
 * Schema: Query.productsWithFilters(filters: ProductFiltersInput, limit, offset)
 * Schema: Query.rootCategory(id)
 *
 * totalCount is always null (API returns a list only, not pagination metadata).
 * For true totals consider Query.productsAdvanced (separate work).
 *
 * @param {object} args
 * @param {string} args.categoryId
 * @param {string|null|undefined} [args.brandId]
 * @param {string|null|undefined} [args.search]
 * @param {number} [args.limit]
 * @param {number} [args.offset]
 * @returns {Promise<{ products: any[]; rootCategory: any; hasMore: boolean; totalCount: null }>}
 */
export async function fetchCategoryListing({
  categoryId,
  brandId,
  search,
  limit = DEFAULT_CATEGORY_PAGE_SIZE,
  offset = 0,
}) {
  const filters = buildProductFilters({ categoryId, brandId, search });
  const data = await graphqlClient.request(PRODUCTS_WITH_FILTERS_LISTING_QUERY, {
    categoryId,
    filters,
    limit,
    offset,
  });
  const products = data.productsWithFilters || [];
  const hasMore = products.length === limit;
  return {
    products,
    rootCategory: data.rootCategory,
    hasMore,
    totalCount: null,
  };
}

/**
 * Resolve root category by slug (and optional legacy ids), then fetch listing.
 * For server components (uses graphqlClient).
 *
 * @param {object} args
 * @param {string} args.slug - RootCategory.slug
 * @param {string[]} [args.legacyRootCategoryIds] - fallback match on id if slug misses
 * @param {string|null|undefined} [args.brandId]
 * @param {string|null|undefined} [args.search]
 * @param {number} [args.limit]
 * @param {number} [args.offset]
 * @param {{ rootCategories?: any[] }|null} [args.categoriesData] - skip categories fetch if already loaded
 */
export async function fetchCategoryListingBySlug({
  slug,
  legacyRootCategoryIds = [],
  brandId,
  search,
  limit = DEFAULT_CATEGORY_PAGE_SIZE,
  offset = 0,
  categoriesData = null,
}) {
  const catsPayload =
    categoriesData ||
    (await graphqlClient.request(GET_CATEGORIES_ONLY_QUERY));
  const rootCategories = catsPayload.rootCategories || [];

  const resolved = findCategoryBySlugForListing(rootCategories, slug);
  let category = resolved?.category ?? null;

  if (!category && legacyRootCategoryIds.length) {
    const idSet = new Set(legacyRootCategoryIds.map(String));
    category = rootCategories.find((c) => idSet.has(String(c.id))) || null;
    if (!category) {
      for (const root of rootCategories) {
        const sub = (root.subCategories || []).find((s) => idSet.has(String(s.id)));
        if (sub) {
          category = sub;
          break;
        }
      }
    }
  }

  if (!category) {
    return {
      notFound: true,
      products: [],
      rootCategory: null,
      hasMore: false,
      totalCount: null,
      category: null,
    };
  }

  const { products, rootCategory, hasMore, totalCount } = await fetchCategoryListing({
    categoryId: category.id,
    brandId,
    search,
    limit,
    offset,
  });

  return {
    notFound: false,
    products,
    rootCategory,
    hasMore,
    totalCount,
    category,
  };
}

/**
 * Convenience: fetch listing using a key from verticalListingConfig.
 * @param {keyof typeof import("./categoryListingSlugs").verticalListingConfig} verticalKey
 */
export async function fetchCategoryListingByVertical(verticalKey, options = {}) {
  const cfg = verticalListingConfig[verticalKey];
  if (!cfg) {
    throw new Error(`fetchCategoryListingByVertical: unknown key "${verticalKey}"`);
  }
  return fetchCategoryListingBySlug({
    slug: cfg.slug,
    legacyRootCategoryIds: cfg.legacyRootCategoryIds,
    ...options,
  });
}

/**
 * Safety cap: max pages of productsWithFilters when aggregating filter counts.
 * Prevents unbounded loops on huge catalogs; counts may be partial if truncated.
 */
export const MAX_CATEGORY_FACET_PAGES = 100;
const DEFAULT_FACET_MAX_PAGES = Number(process.env.LISTING_FACET_MAX_PAGES || 3);
const FACET_CACHE_TTL_MS = Number(process.env.LISTING_FACET_CACHE_TTL_MS || 5 * 60 * 1000);
const facetCache = new Map();
const facetInflight = new Map();

/**
 * Paginate productsWithFilters for a category and aggregate attribute value counts
 * for filter UI (full category, same filters as listing).
 *
 * @param {{ categoryId: string; brandId?: string | null; search?: string | null; limit?: number; maxPages?: number }} args
 * @returns {Promise<{ brands: string[]; attributeValues: Array<{ attribute: string; values: string[]; countsByValue: Record<string, number> }> }>}
 */
export async function fetchCategoryAttributeFacets({
  categoryId,
  brandId,
  search,
  limit = DEFAULT_CATEGORY_PAGE_SIZE,
  maxPages = DEFAULT_FACET_MAX_PAGES,
}) {
  const safeMaxPages = Math.max(
    1,
    Math.min(MAX_CATEGORY_FACET_PAGES, Number(maxPages) || DEFAULT_FACET_MAX_PAGES)
  );
  const filters = buildProductFilters({ categoryId, brandId, search });
  const cacheKey = JSON.stringify({
    categoryId: String(categoryId),
    brandId: brandId == null ? null : String(brandId),
    search: search == null ? null : String(search),
    limit: Number(limit) || DEFAULT_CATEGORY_PAGE_SIZE,
    maxPages: safeMaxPages,
  });

  const cached = facetCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < FACET_CACHE_TTL_MS) {
    return cached.value;
  }
  if (facetInflight.has(cacheKey)) {
    return facetInflight.get(cacheKey);
  }

  const run = (async () => {
  const allProducts = [];
  let offset = 0;

  for (let page = 0; page < safeMaxPages; page += 1) {
    const data = await graphqlClient.request(PRODUCTS_WITH_FILTERS_QUERY, {
      filters,
      limit,
      offset,
    });
    const batch = data.productsWithFilters || [];
    allProducts.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

    const result = buildListingAttributeFacetsFromProducts(allProducts);
    facetCache.set(cacheKey, { ts: Date.now(), value: result });
    return result;
  })();

  facetInflight.set(cacheKey, run);
  try {
    return await run;
  } finally {
    facetInflight.delete(cacheKey);
  }
}
