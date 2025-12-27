import { Suspense } from "react";
import { graphqlClient } from "../../../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_FILTERED_QUERY, GET_CATEGORIES_ONLY_QUERY } from "../../../lib/queries";
import { removeDuplicateProducts } from "../../../lib/removeDuplicateProducts";
import Loader from "../../../Componants/Loader";
import ProductsClientPage from "../../ProductsClientPage";

/**
 * ✅ جلب المنتجات مع pagination باستخدام limit و offset
 * - يستخدم PRODUCTS_BY_CATEGORY_FILTERED_QUERY الذي يدعم limit/offset
 * - يقلل استهلاك السيرفر بجلب 30 منتج فقط في كل صفحة
 */
const fetchProductsByCategory = async (categorySlug, page = 1, limit = 30) => {
  // ⚠️ Cannot fetch all products - must have a category
  if (!categorySlug) {
    console.warn("⚠️ Cannot fetch products without categoryId - this causes 503 errors");
    return { products: [], rootCategory: null, totalCount: 0 };
  }

  // 🔹 البحث عن category بالـ slug أولاً
  const categoriesData = await graphqlClient.request(GET_CATEGORIES_ONLY_QUERY);
  const foundCategory = categoriesData.rootCategories?.find(
    (cat) => cat.slug === categorySlug
  );

  if (!foundCategory) {
    return { products: [], rootCategory: null, totalCount: 0 };
  }

  // حساب offset من page number
  const offset = (page - 1) * limit;

  // جلب المنتجات باستخدام limit و offset
  const variables = { 
    categoryId: foundCategory.id,
    limit: limit,
    offset: offset
  };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_FILTERED_QUERY, variables);

  let products = data.productsByCategory || [];

  // ✅ إزالة المنتجات المكررة بناءً على product.id
  products = removeDuplicateProducts(products);

  products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // حساب total count بناءً على hasMore
  // إذا كان hasMore = true، فهناك صفحات إضافية
  // إذا كان hasMore = false، فالصفحة الحالية هي الأخيرة
  const hasMore = products.length === limit;
  const totalCount = hasMore ? limit * (page + 1) : (limit * (page - 1)) + products.length;

  return { 
    products, 
    rootCategory: data.rootCategory,
    totalCount,
    hasMore
  };
};

export default async function ProductsFiltersPage({ params, searchParams }) {
  const categorySlug = params?.slug || null;
  const filters = params?.filters || [];
  const page = parseInt(searchParams?.page || '1', 10);
  
  const { products, rootCategory, totalCount, hasMore } = await fetchProductsByCategory(categorySlug, page, 30);

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
        currentPage={page}
        totalCount={totalCount}
        hasMore={hasMore}
      />
    </Suspense>
  );
}

