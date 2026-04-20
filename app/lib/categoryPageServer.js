import { resolveSearchParams } from "./paginationUrl";
import { DEFAULT_CATEGORY_PAGE_SIZE } from "./fetchCategoryListing";

export function parseListingPage(searchParams) {
  const raw = searchParams?.page;
  const n = parseInt(Array.isArray(raw) ? raw[0] : String(raw ?? "1"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Resolve ?page= and offset for Query.productsWithFilters (see listingConfig LISTING_PAGE_SIZE). */
export async function getListingPageQuery(searchParams) {
  const sp = await resolveSearchParams(searchParams);
  const page = parseListingPage(sp);
  const offset = (page - 1) * DEFAULT_CATEGORY_PAGE_SIZE;
  return { page, offset, searchParams: sp };
}
