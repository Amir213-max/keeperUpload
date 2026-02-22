import { Suspense } from "react";
import { graphqlClient } from "../../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY } from "../../lib/queries";
import { removeDuplicateProducts } from "../../lib/removeDuplicateProducts";
import ApparelClientPage from "../ApparelClientpage";
import Loader from "../../Componants/Loader";

const FOOTBALL_BOOTS_CATEGORY_ID = "113"; 

const fetchProductsByCategory = async () => {
  const variables = { 
    categoryId: FOOTBALL_BOOTS_CATEGORY_ID
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

  products = removeDuplicateProducts(products);
  products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return { products, rootCategory: data.rootCategory };
};

export default async function Page({ params }) {
  // 🔹 استخدام نفس البيانات من الصفحة الأساسية
  // 🔹 الفلترة تعمل على البيانات المحملة مسبقاً في الـ client-side
  const { products, rootCategory } = await fetchProductsByCategory();

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

  const brands = [...new Set(products.map((p) => p.brand_name).filter(Boolean))];

  return (
    <Suspense fallback={<Loader />}>
      <ApparelClientPage
        products={products} 
        brands={brands} 
        attributeValues={attributeValues}
        rootCategory={rootCategory}
      />
    </Suspense>
  );
}
