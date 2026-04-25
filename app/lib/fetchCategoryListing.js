import { unstable_cache } from "next/cache";
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

/** Dedupe listing products by GraphQL id, then sku (defensive for merged subtree lists). */
export function dedupeProductsByStableKey(products) {
  if (!Array.isArray(products) || products.length === 0) return [];
  const map = new Map();
  for (const p of products) {
    const idPart = p?.id != null && String(p.id).trim() !== "" ? `id:${String(p.id)}` : null;
    const key = idPart || (p?.sku != null && String(p.sku).trim() !== "" ? `sku:${String(p.sku)}` : null);
    if (!key || map.has(key)) continue;
    map.set(key, p);
  }
  return [...map.values()];
}

function subtreeMergeDisabled() {
  return String(process.env.LISTING_SUBTREE_MERGE || "").toLowerCase() === "false";
}

function mergeMaxPagesPerCategory() {
  return Math.max(
    1,
    Math.min(
      100,
      Number(process.env.LISTING_SUBTREE_MERGE_MAX_PAGES_PER_CATEGORY || 30) || 30
    )
  );
}

/**
 * Paginate productsWithFilters for one category filter; uses listing query so payloads match listing UI.
 * @param {{ rootCategoryId: string; categoryFilterId: string; brandId?: string|null; search?: string|null; batchLimit: number; maxPages: number }} args
 */
async function fetchListingProductPagesForCategoryFilter({
  rootCategoryId,
  categoryFilterId,
  brandId,
  search,
  batchLimit,
  maxPages,
}) {
  const filters = buildProductFilters({ categoryId: categoryFilterId, brandId, search });
  const out = [];
  let rootCategory = null;
  let offset = 0;
  for (let i = 0; i < maxPages; i += 1) {
    const data = await graphqlClient.request(PRODUCTS_WITH_FILTERS_LISTING_QUERY, {
      categoryId: rootCategoryId,
      filters,
      limit: batchLimit,
      offset,
    });
    if (!rootCategory) rootCategory = data.rootCategory ?? null;
    const batch = data.productsWithFilters || [];
    out.push(...batch);
    if (batch.length < batchLimit) break;
    offset += batchLimit;
  }
  return { products: out, rootCategory };
}

/**
 * Collect merged products (root + subcategories), deduped, sorted — heavy; cached across ?page= requests.
 */
async function collectMergedListingProductsFull({
  rootCategoryId,
  mergeSubCategoryIds,
  brandId,
  search,
  batchLimit,
  maxPages,
}) {
  const filterIds = [
    String(rootCategoryId),
    ...mergeSubCategoryIds.map(String).filter((id) => id && id !== String(rootCategoryId)),
  ];
  const chunks = await Promise.all(
    filterIds.map((cid) =>
      fetchListingProductPagesForCategoryFilter({
        rootCategoryId,
        categoryFilterId: cid,
        brandId,
        search,
        batchLimit,
        maxPages,
      })
    )
  );

  let rootCategory = null;
  const merged = [];
  const seen = new Set();
  for (const { products: batch, rootCategory: rc } of chunks) {
    if (!rootCategory) rootCategory = rc;
    for (const p of batch) {
      const idPart = p?.id != null && String(p.id).trim() !== "" ? `id:${String(p.id)}` : null;
      const key = idPart || (p?.sku != null && String(p.sku).trim() !== "" ? `sku:${String(p.sku)}` : null);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
    }
  }
  merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { products: merged, rootCategory };
}

const MERGED_LIST_CACHE_SECONDS = Number(process.env.LISTING_MERGED_CACHE_SECONDS || 120);

/** Stable cache key payload (sorted sub ids) for unstable_cache. */
function mergedListingCachePayload(rootCategoryId, mergeSubCategoryIds, brandId, search, batchLimit, maxPages) {
  const subs = [...mergeSubCategoryIds].map(String).sort().join(",");
  return JSON.stringify({
    root: String(rootCategoryId),
    subs,
    brand: brandId == null ? "" : String(brandId),
    search: search == null ? "" : String(search).trim(),
    batch: Number(batchLimit) || LISTING_PAGE_SIZE,
    maxPages: Number(maxPages) || mergeMaxPagesPerCategory(),
  });
}

const getMergedListingProductsCached = unstable_cache(
  async (payloadJson) => {
    const p = JSON.parse(payloadJson);
    const mergeSubCategoryIds = p.subs ? p.subs.split(",").filter(Boolean) : [];
    const brandId = p.brand === "" ? null : p.brand || null;
    const search = p.search === "" ? null : p.search || null;
    return collectMergedListingProductsFull({
      rootCategoryId: p.root,
      mergeSubCategoryIds,
      brandId,
      search,
      batchLimit: p.batch,
      maxPages: p.maxPages,
    });
  },
  ["listing-merged-products-full"],
  { revalidate: MERGED_LIST_CACHE_SECONDS }
);

/**
 * Collect + dedupe + sort products for root listing when subtree merge is enabled.
 * Full merged list is cached so pagination (?page=2+) does not re-fetch every category tree.
 */
async function fetchMergedRootListing({
  rootCategoryId,
  mergeSubCategoryIds,
  brandId,
  search,
  pageLimit,
  offset,
  batchLimit,
}) {
  const maxPages = mergeMaxPagesPerCategory();
  const payload = mergedListingCachePayload(
    rootCategoryId,
    mergeSubCategoryIds,
    brandId,
    search,
    batchLimit,
    maxPages
  );
  const { products: merged, rootCategory } = await getMergedListingProductsCached(payload);
  const pageSlice = merged.slice(offset, offset + pageLimit);
  const hasMore = merged.length > offset + pageSlice.length;
  return {
    products: pageSlice,
    rootCategory,
    hasMore,
    totalCount: null,
  };
}

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
  mergeSubCategoryIds,
}) {
  const subs = Array.from(
    new Set(
      (mergeSubCategoryIds || [])
        .map((x) => String(x ?? "").trim())
        .filter((id) => id && id !== String(categoryId))
    )
  );
  const useMerge = subs.length > 0 && !subtreeMergeDisabled();

  if (useMerge) {
    return fetchMergedRootListing({
      rootCategoryId: String(categoryId),
      mergeSubCategoryIds: subs,
      brandId,
      search,
      pageLimit: limit,
      offset,
      batchLimit: limit,
    });
  }

  const filters = buildProductFilters({ categoryId, brandId, search });
  const data = await graphqlClient.request(PRODUCTS_WITH_FILTERS_LISTING_QUERY, {
    categoryId,
    filters,
    limit,
    offset,
  });
  const raw = data.productsWithFilters || [];
  const products = dedupeProductsByStableKey(raw);
  const hasMore = raw.length === limit;
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
      mergeSubCategoryIds: [],
    };
  }

  const mergeSubCategoryIds =
    !subtreeMergeDisabled() &&
    Array.isArray(category.subCategories) &&
    category.subCategories.length > 0
      ? category.subCategories.map((s) => s?.id).filter(Boolean).map(String)
      : [];

  const { products, rootCategory, hasMore, totalCount } = await fetchCategoryListing({
    categoryId: category.id,
    brandId,
    search,
    limit,
    offset,
    mergeSubCategoryIds: mergeSubCategoryIds.length > 0 ? mergeSubCategoryIds : undefined,
  });

  return {
    notFound: false,
    products,
    rootCategory,
    hasMore,
    totalCount,
    category,
    mergeSubCategoryIds,
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
 * @param {{ categoryId: string; brandId?: string | null; search?: string | null; limit?: number; maxPages?: number; mergeSubCategoryIds?: string[] }} args
 * @returns {Promise<{ brands: string[]; attributeValues: Array<{ attribute: string; values: string[]; countsByValue: Record<string, number> }> }>}
 */
export async function fetchCategoryAttributeFacets({
  categoryId,
  brandId,
  search,
  limit = DEFAULT_CATEGORY_PAGE_SIZE,
  maxPages = DEFAULT_FACET_MAX_PAGES,
  mergeSubCategoryIds,
}) {
  const subs = Array.from(
    new Set(
      (mergeSubCategoryIds || [])
        .map((x) => String(x ?? "").trim())
        .filter((id) => id && id !== String(categoryId))
    )
  );
  const useMerge = subs.length > 0 && !subtreeMergeDisabled();

  const safeMaxPages = Math.max(
    1,
    Math.min(MAX_CATEGORY_FACET_PAGES, Number(maxPages) || DEFAULT_FACET_MAX_PAGES)
  );
  const mergePagesCap = useMerge ? mergeMaxPagesPerCategory() : safeMaxPages;

  const cacheKey = JSON.stringify({
    categoryId: String(categoryId),
    brandId: brandId == null ? null : String(brandId),
    search: search == null ? null : String(search),
    limit: Number(limit) || DEFAULT_CATEGORY_PAGE_SIZE,
    maxPages: safeMaxPages,
    mergeSubs: useMerge ? subs : null,
  });

  const cached = facetCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < FACET_CACHE_TTL_MS) {
    return cached.value;
  }
  if (facetInflight.has(cacheKey)) {
    return facetInflight.get(cacheKey);
  }

  const run = (async () => {
    let allProducts = [];

    if (useMerge) {
      const merged = [];
      const seen = new Set();
      const ids = [String(categoryId), ...subs];
      const perCategory = await Promise.all(
        ids.map(async (cid) => {
          const filters = buildProductFilters({ categoryId: cid, brandId, search });
          const rows = [];
          let off = 0;
          for (let page = 0; page < mergePagesCap; page += 1) {
            const data = await graphqlClient.request(PRODUCTS_WITH_FILTERS_QUERY, {
              filters,
              limit,
              offset: off,
            });
            const batch = data.productsWithFilters || [];
            rows.push(...batch);
            if (batch.length < limit) break;
            off += limit;
          }
          return rows;
        })
      );
      for (const batch of perCategory) {
        for (const p of batch) {
          const idPart =
            p?.id != null && String(p.id).trim() !== "" ? `id:${String(p.id)}` : null;
          const k =
            idPart ||
            (p?.sku != null && String(p.sku).trim() !== "" ? `sku:${String(p.sku)}` : null);
          if (!k || seen.has(k)) continue;
          seen.add(k);
          merged.push(p);
        }
      }
      allProducts = merged;
    } else {
      const filters = buildProductFilters({ categoryId, brandId, search });
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
