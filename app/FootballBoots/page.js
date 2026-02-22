import { Suspense } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY } from "../lib/queries";
import { removeDuplicateProducts } from "../lib/removeDuplicateProducts";
import Loader from "../Componants/Loader";
import FootballClientPage from "./FootballBootsClientpage";

// 🟢 يمكنك تغيير ID أو جعله Array لعرض أكتر من SubCategory
const FOOTBALL_BOOTS_CATEGORY_ID = "54";

/**
 * IMPORTANT: 
 * - The GraphQL schema does NOT support `limit` on `rootCategory.products`
 * - Must fetch products by categoryId to prevent 503 errors
 * - Client-side slicing (24 items) is applied after fetching
 */
// 🟢 جلب المنتجات بالكامل (من الكاتيجوري + السب كاتيجوريز)
const fetchProductsByCategory = async () => {
  const variables = { 
    categoryId: FOOTBALL_BOOTS_CATEGORY_ID
  };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, variables);

  let products = data.rootCategory?.products || [];

  // جمع منتجات الـ SubCategories
  if (data.rootCategory?.subCategories) {
    data.rootCategory.subCategories.forEach((sub) => {
      if (sub.products && Array.isArray(sub.products)) {
        products = [...products, ...sub.products];
      }
    });
  }

  // ✅ إزالة المنتجات المكررة بناءً على product.id
  products = removeDuplicateProducts(products);

  // ترتيب المنتجات بالأحدث
  products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return { products, rootCategory: data.rootCategory };
};

export default async function Page() {
  const { products, rootCategory } = await fetchProductsByCategory();

  // ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
  // 🟢 جمع Attributes للفلترة
  // ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
  const attributeMap = {};

  products.forEach((product) => {
    if (product.productAttributeValues) {
      product.productAttributeValues.forEach((attr) => {
        const label = attr.attribute?.label;
        const value = attr.key;

        if (label && value) {
          if (!attributeMap[label]) attributeMap[label] = new Set();
          attributeMap[label].add(value);
        }
      });
    }
  });

  const attributeValues = Object.entries(attributeMap).map(([attribute, values]) => ({
    attribute,
    values: Array.from(values),
  }));

  // ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
  // 🟢 جمع البراندات
  // ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
  const brands = [...new Set(products.map((p) => p.brand_name).filter(Boolean))];

  return (
    <Suspense fallback={<Loader />}>
      <FootballClientPage 
        products={products}
        brands={brands}
        attributeValues={attributeValues}
        rootCategory={rootCategory}
      />
    </Suspense>
  );
}
