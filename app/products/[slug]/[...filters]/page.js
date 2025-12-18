import { Suspense } from "react";
import { graphqlClient } from "../../../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY, GET_CATEGORIES_ONLY_QUERY } from "../../../lib/queries";
import { removeDuplicateProducts } from "../../../lib/removeDuplicateProducts";
import Loader from "../../../Componants/Loader";
import ProductsClientPage from "../../ProductsClientPage";

/**
 * IMPORTANT: 
 * - The GraphQL schema does NOT support `limit` on `rootCategory.products`
 * - Must fetch products by categoryId to prevent 503 errors
 * - Client-side slicing (24 items) is applied after fetching
 */
const fetchProductsByCategory = async (categorySlug) => {
  // ⚠️ Cannot fetch all products - must have a category
  if (!categorySlug) {
    console.warn("⚠️ Cannot fetch products without categoryId - this causes 503 errors");
    return { products: [], rootCategory: null };
  }

  // 🔹 البحث عن category بالـ slug أولاً
  const categoriesData = await graphqlClient.request(GET_CATEGORIES_ONLY_QUERY);
  const foundCategory = categoriesData.rootCategories?.find(
    (cat) => cat.slug === categorySlug
  );

  if (!foundCategory) {
    return { products: [], rootCategory: null };
  }

  // جلب المنتجات باستخدام categoryId (no limit on rootCategory.products - not supported)
  const variables = { 
    categoryId: foundCategory.id
  };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, variables);

  let products = data.rootCategory?.products || [];

  if (data.rootCategory?.subCategories) {
    data.rootCategory.subCategories.forEach((sub) => {
      if (sub.products) {
        products = [...products, ...sub.products];
      }
    });
  }

  // ✅ إزالة المنتجات المكررة بناءً على product.id
  products = removeDuplicateProducts(products);

  products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // ✅ Client-side limiting: Slice to 24 products for product grids
  const DEFAULT_PRODUCT_LIMIT = 24;
  products = products.slice(0, DEFAULT_PRODUCT_LIMIT);

  return { products, rootCategory: data.rootCategory };
};

export default async function ProductsFiltersPage({ params }) {
  const categorySlug = params?.slug || null;
  const filters = params?.filters || [];
  
  const { products, rootCategory } = await fetchProductsByCategory(categorySlug);

  const attributeMap = {};
  products.forEach((product) => {
    if (product.productAttributeValues) {
      product.productAttributeValues.forEach((attr) => {
        const key = attr.attribute?.label;
        const value = attr.key;

        if (key && value) {
          if (!attributeMap[key]) attributeMap[key] = new Set();
          attributeMap[key].add(value);
        }
      });
    }
  });

  const attributeValues = Object.entries(attributeMap).map(([attribute, values]) => ({
    attribute,
    values: Array.from(values),
  }));

  const brands = [...new Set(products.map((p) => p.brand?.name).filter(Boolean))];

  return (
    <Suspense fallback={<Loader />}>
      <ProductsClientPage
        products={products}
        brands={brands}
        attributeValues={attributeValues}
        categorySlug={categorySlug}
        rootCategory={rootCategory}
        initialFilters={filters}
      />
    </Suspense>
  );
}

