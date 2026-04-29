import { Suspense } from "react";
import { notFound } from "next/navigation";
import Loader from "../Componants/Loader";
import {
  fetchCategoryListingByVertical,
  fetchCategoryAttributeFacets,
  getListingCategoriesData,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "../lib/fetchCategoryListing";
import { getListingPageQuery } from "../lib/categoryPageServer";
import FootballClientPage from "./FootballBootsClientpage";

export const revalidate = 120;

async function load(searchParams) {
  const { offset, page } = await getListingPageQuery(searchParams);
  const result = await fetchCategoryListingByVertical("footballBoots", {
    limit: DEFAULT_CATEGORY_PAGE_SIZE,
    offset,
  });
  if (result.notFound) notFound();

  const sorted = [...result.products].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  return {
    products: sorted,
    rootCategory: result.rootCategory,
    hasMore: result.hasMore,
    categoryId: result.category.id,
    mergeSubCategoryIds: result.mergeSubCategoryIds ?? [],
    pageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    page,
  };
}

export default async function Page({ searchParams }) {
  const { products, rootCategory, hasMore, categoryId, mergeSubCategoryIds, pageSize, page } =
    await load(searchParams);
  const categoriesData = await getListingCategoriesData();

  const { brands, attributeValues } = await fetchCategoryAttributeFacets({
    categoryId,
    maxPages: 1,
    mergeSubCategoryIds,
  });

  return (
    <Suspense fallback={<Loader />}>
      <FootballClientPage
        key={`listing-page-${page}`}
        products={products}
        brands={brands}
        attributeValues={attributeValues}
        rootCategory={rootCategory}
        initialCategories={categoriesData?.rootCategories || []}
        categoryId={categoryId}
        initialHasMore={hasMore}
        listingPageSize={pageSize}
        initialPage={page}
      />
    </Suspense>
  );
}
