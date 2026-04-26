import { Suspense } from "react";
import { notFound } from "next/navigation";
import Loader from "../../Componants/Loader";
import {
  fetchCategoryListingBySlug,
  fetchCategoryAttributeFacets,
  getListingCategoriesData,
  DEFAULT_CATEGORY_PAGE_SIZE,
} from "../../lib/fetchCategoryListing";
import { getListingPageQuery } from "../../lib/categoryPageServer";
import ProductsClientPage from "../ProductsClientPage";

async function fetchProductsByCategory(categorySlug, searchParams) {
  if (!categorySlug) {
    return {
      products: [],
      rootCategory: null,
      hasMore: false,
      categoryId: null,
      pageSize: DEFAULT_CATEGORY_PAGE_SIZE,
      page: 1,
    };
  }

  const { offset, page } = await getListingPageQuery(searchParams);
  const categoriesData = await getListingCategoriesData();
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
    hasMore: result.hasMore,
    categoryId: result.category.id,
    mergeSubCategoryIds: result.mergeSubCategoryIds ?? [],
    pageSize: DEFAULT_CATEGORY_PAGE_SIZE,
    page,
  };
}

export default async function ProductsSlugPage({ params, searchParams }) {
  const categorySlug = params?.slug || null;
  const { products, rootCategory, categoriesData, hasMore, categoryId, mergeSubCategoryIds, pageSize, page } =
    await fetchProductsByCategory(categorySlug, searchParams);

  let brands = [];
  let attributeValues = [];
  if (categoryId) {
    const facet = await fetchCategoryAttributeFacets({
      categoryId,
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
        categoryId={categoryId}
        hasMore={hasMore}
        listingPageSize={pageSize}
        currentPage={page}
      />
    </Suspense>
  );
}
