import { Suspense } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY } from "../lib/queries";
import { removeDuplicateProducts } from "../lib/removeDuplicateProducts";
import EquipmentClientPage from "./EquipmenClientpage";
import Loader from "../Componants/Loader";

const FOOTBALL_BOOTS_CATEGORY_ID = "52"; 
// تقدر تعدل الـ ID أو تخليها Array وتعرض أكتر من SubCategory لو حابب

/**
 * IMPORTANT: 
 * - The GraphQL schema does NOT support `limit` on `rootCategory.products`
 * - Must fetch products by categoryId to prevent 503 errors
 * - Client-side slicing (24 items) is applied after fetching
 */
const fetchProductsByCategory = async () => {
  const variables = { 
    categoryId: FOOTBALL_BOOTS_CATEGORY_ID
  };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, variables);

  // هنجيب المنتجات الخاصة بالكاتيجوري + المنتجات الخاصة بالسب كاتيجوريز
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

  // 🟢 عرض المنتجات من الأحدث إلى الأقدم
  products = products.reverse();
  
  // ✅ Client-side limiting: Slice to 24 products for product grids
  const DEFAULT_PRODUCT_LIMIT = 24;
  products = products.slice(0, DEFAULT_PRODUCT_LIMIT);

  return { products, rootCategory: data.rootCategory };
};

export default async function Page() {
  const { products, rootCategory } = await fetchProductsByCategory();

  // 🟢 تجهيز الـ Attributes (فلترة بالخصائص زي الحجم أو اللون)
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

  // 🟢 تجهيز الـ Brands
  const brands = [...new Set(products.map((p) => p.brand?.name).filter(Boolean))];

  return (
    <Suspense fallback={<Loader />}>
      <EquipmentClientPage 
        products={products} 
        brands={brands} 
        attributeValues={attributeValues}
        rootCategory={rootCategory}
      />
    </Suspense>
  );
}
