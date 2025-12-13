import { Suspense } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY } from "../lib/queries";
import TeamsportClientPage from "./TeamsportClientPage";
import Loader from "../Componants/Loader";

const FOOTBALL_BOOTS_CATEGORY_ID = "21"; 
// تقدر تعدل الـ ID أو تخليها Array وتعرض أكتر من SubCategory لو حابب

const fetchProductsByCategory = async () => {
  const variables = { categoryId: FOOTBALL_BOOTS_CATEGORY_ID };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, variables);

  // 🟢 جمع المنتجات الخاصة بالكاتيجوري + المنتجات الخاصة بالسب كاتيجوريز
  let products = data.rootCategory?.products || [];

  if (data.rootCategory?.subCategories) {
    data.rootCategory.subCategories.forEach((sub) => {
      if (sub.products) {
        products = [...products, ...sub.products];
      }
    });
  }

  // ✅ ترتيب المنتجات من الأحدث للأقدم
  // لو عندك created_at في البيانات
  products = products.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // لو مفيش created_at في الداتا، استخدم السطر ده بدل اللي فوق:
  // products = products.reverse();

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
      <TeamsportClientPage 
        products={products} 
        brands={brands} 
        attributeValues={attributeValues}
        rootCategory={rootCategory}
      />
    </Suspense>
  );
}
