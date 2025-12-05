import { Suspense } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY } from "../lib/queries";

import Loader from "../Componants/Loader";
import ProductsClientPage from "./ProductsClientPage";

const fetchProductsByCategory = async (categoryId) => {
  if (!categoryId) return [];
  
  const variables = { categoryId };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, variables);

  // جمع المنتجات من الكاتيجوري والسب كاتيجوريز
  let products = data.rootCategory?.products || [];

  if (data.rootCategory?.subCategories) {
    data.rootCategory.subCategories.forEach((sub) => {
      if (sub.products) {
        products = [...products, ...sub.products];
      }
    });
  }

  // ترتيب المنتجات من الأحدث إلى الأقدم حسب created_at
  products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return products;
};

export default async function ProductsPage({ searchParams }) {
  const categoryId = searchParams?.category || null;
  const products = await fetchProductsByCategory(categoryId);

  // تجهيز الـ Attributes (فلترة بالخصائص زي الحجم أو اللون)
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

  // تجهيز الـ Brands
  const brands = [...new Set(products.map((p) => p.brand?.name).filter(Boolean))];

  return (
    <Suspense fallback={<Loader />}>
      <ProductsClientPage
        products={products} 
        brands={brands} 
        attributeValues={attributeValues}
        categoryId={categoryId}
      />
    </Suspense>
  );
}
