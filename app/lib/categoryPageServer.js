import { resolveSearchParams } from "./paginationUrl";
import { DEFAULT_CATEGORY_PAGE_SIZE } from "./fetchCategoryListing";
import { parseListingPage } from "./listingPageParse";

/** Resolve ?page= and offset for Query.productsWithFilters (see listingConfig LISTING_PAGE_SIZE). */
export async function getListingPageQuery(searchParams) {
  const sp = await resolveSearchParams(searchParams);
  const page = parseListingPage(sp);
  const offset = (page - 1) * DEFAULT_CATEGORY_PAGE_SIZE;
  return { page, offset, searchParams: sp };
}
