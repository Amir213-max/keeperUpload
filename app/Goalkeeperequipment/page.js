import { Suspense } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY } from "../lib/queries";
import EquipmentClientPage from "./EquipmenClientpage";
import Loader from "../Componants/Loader";

const FOOTBALL_BOOTS_CATEGORY_ID = "52"; 
// تقدر تعدل الـ ID أو تخليها Array وتعرض أكتر من SubCategory لو حابب

const fetchProductsByCategory = async () => {
  const variables = { categoryId: FOOTBALL_BOOTS_CATEGORY_ID };
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

  // 🟢 عرض المنتجات من الأحدث إلى الأقدم
  products = products.reverse();

  return products;
};

export default async function Page() {
  const products = await fetchProductsByCategory();

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
      />
    </Suspense>
  );
}
