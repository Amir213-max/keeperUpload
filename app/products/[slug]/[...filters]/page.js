import { Suspense } from "react";
import { notFound } from "next/navigation";
import Loader from "../../../Componants/Loader";
import {
  fetchCategoryListingBySlug,
  fetchCategoryAttributeFacets,
  getListingCategoriesData,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "../../../lib/fetchCategoryListing";
import { getListingPageQuery } from "../../../lib/categoryPageServer";
import ProductsClientPage from "../../ProductsClientPage";

export const revalidate = 120;

const fetchProductsByCategory = async (categorySlug, searchParams) => {
  if (!categorySlug) {
    return {
      products: [],
      rootCategory: null,
      totalCount: 0,
      hasMore: false,
      categoryId: null,
      page: 1,
      pageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    };
  }

  const [{ offset, page }, categoriesData] = await Promise.all([
    getListingPageQuery(searchParams),
    getListingCategoriesData(),
  ]);
  const result = await fetchCategoryListingBySlug({
    slug: categorySlug,
    limit: DEFAULT_CATEGORY_PAGE_SIZE,
    offset,
    categoriesData,
  });

  if (result.notFound) {
    notFound();
  }

  const sorted = [...result.products].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return {
    products: sorted,
    rootCategory: result.rootCategory,
    categoriesData,
    totalCount: sorted.length + offset,
    hasMore: result.hasMore,
    categoryId: result.category.id,
    mergeSubCategoryIds: result.mergeSubCategoryIds ?? [],
    page,
    pageSize: DEFAULT_CATEGORY_PAGE_SIZE,
  };
};

export default async function ProductsFiltersPage({ params, searchParams }) {
  const categorySlug = params?.slug || null;
  const filters = params?.filters || [];

  const { products, rootCategory, categoriesData, totalCount, hasMore, categoryId, mergeSubCategoryIds, page, pageSize } =
    await fetchProductsByCategory(categorySlug, searchParams);

  let brands = [];
  let attributeValues = [];
  if (categoryId) {
    const facet = await fetchCategoryAttributeFacets({
      categoryId,
      maxPages: 1,
      mergeSubCategoryIds,
    });
    brands = facet.brands;
    attributeValues = facet.attributeValues;
  }

  return (
    <Suspense fallback={<Loader />}>
      <ProductsClientPage
        key={`listing-page-${page}`}
        products={products}
        brands={brands}
        attributeValues={attributeValues}
        categorySlug={categorySlug}
        rootCategory={rootCategory}
        initialCategories={categoriesData?.rootCategories || []}
        initialFilters={filters}
        currentPage={page}
        totalCount={totalCount}
        hasMore={hasMore}
        categoryId={categoryId}
        listingPageSize={pageSize}
      />
    </Suspense>
  );
}
