import { Suspense } from "react";
import { notFound } from "next/navigation";
import GoalKeeperClientPage from "./GoalkeeperClientPage";
import Loader from "../Componants/Loader";
import {
  fetchCategoryListingByVertical,
  fetchCategoryAttributeFacets,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "../lib/fetchCategoryListing";
import { getListingPageQuery } from "../lib/categoryPageServer";

export const revalidate = 120;

const fetchProductsByCategory = async (searchParams) => {
  const { page, offset } = await getListingPageQuery(searchParams);

  const result = await fetchCategoryListingByVertical("goalkeeperGloves", {
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
    pageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    page,
  };
};

export default async function Page({ searchParams }) {
  const { products, rootCategory, hasMore, categoryId, pageSize, page } =
    await fetchProductsByCategory(searchParams);

  const { brands, attributeValues } = await fetchCategoryAttributeFacets({
    categoryId,
    maxPages: 1,
  });

  return (
    <Suspense fallback={<Loader />}>
      <GoalKeeperClientPage
        products={products}
        brands={brands}
        attributeValues={attributeValues}
        rootCategory={rootCategory}
        categoryId={categoryId}
        initialHasMore={hasMore}
        listingPageSize={pageSize}
        initialPage={page}
      />
    </Suspense>
  );
}
