import { Suspense } from "react";
import { graphqlClient } from "../../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY } from "../../lib/queries";
import { removeDuplicateProducts } from "../../lib/removeDuplicateProducts";
import Loader from "../../Componants/Loader";
import FootballClientPage from "../FootballBootsClientpage";

const FOOTBALL_BOOTS_CATEGORY_ID = "54";

const fetchProductsByCategory = async () => {
  const variables = { 
    categoryId: FOOTBALL_BOOTS_CATEGORY_ID
  };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, variables);

  let products = data.rootCategory?.products || [];

  if (data.rootCategory?.subCategories) {
    data.rootCategory.subCategories.forEach((sub) => {
      if (sub.products && Array.isArray(sub.products)) {
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

  const brands = [...new Set(products.map((p) => p.brand?.name).filter(Boolean))];

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
