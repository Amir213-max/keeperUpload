import { Suspense } from "react";
import { notFound } from "next/navigation";
import FootballClientPage from "../FootballBootsClientpage";
import Loader from "../../Componants/Loader";
import {
  fetchCategoryListingByVertical,
  fetchCategoryAttributeFacets,
  getListingCategoriesData,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "../../lib/fetchCategoryListing";
import { getListingPageQuery } from "../../lib/categoryPageServer";

export const revalidate = 120;

export default async function Page({ searchParams }) {
  const [{ offset, page }, categoriesData] = await Promise.all([
    getListingPageQuery(searchParams),
    getListingCategoriesData(),
  ]);
  const result = await fetchCategoryListingByVertical("footballBoots", {
    limit: DEFAULT_CATEGORY_PAGE_SIZE,
    offset,
  });
  if (result.notFound) notFound();

  const sorted = [...result.products].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const { brands, attributeValues } = await fetchCategoryAttributeFacets({
    categoryId: result.category.id,
    maxPages: 1,
    mergeSubCategoryIds: result.mergeSubCategoryIds ?? [],
  });

  return (
    <Suspense fallback={<Loader />}>
      <FootballClientPage
        key={`listing-page-${page}`}
        products={sorted}
        brands={brands}
        attributeValues={attributeValues}
        initialCategories={categoriesData?.rootCategories || []}
        rootCategory={result.rootCategory}
        categoryId={result.category.id}
        initialHasMore={result.hasMore}
        listingPageSize={DEFAULT_CATEGORY_PAGE_SIZE}
        initialPage={page}
      />
    </Suspense>
  );
}
