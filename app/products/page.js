import { Suspense } from "react";
import { redirect } from "next/navigation";
import { graphqlClient } from "../lib/graphqlClient";
import { GET_CATEGORIES_QUERY } from "../lib/queries";

import Loader from "../Componants/Loader";
import ProductsClientPage from "./ProductsClientPage";

const fetchAllProducts = async () => {
  try {
    const data = await graphqlClient.request(GET_CATEGORIES_QUERY);
    const products = data.products || [];
    products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { products, rootCategory: null };
  } catch (error) {
    console.error("Error fetching all products:", error);
    return { products: [], rootCategory: null };
  }
};

export default async function ProductsPage({ searchParams }) {
  // In Next.js 15, searchParams must be awaited before accessing its properties
  const resolvedSearchParams = await searchParams;
  
  // 🔹 إذا كان هناك category في query parameter، redirect إلى path
  const categoryFromQuery = resolvedSearchParams?.category;
  if (categoryFromQuery) {
    // 🔹 البحث عن slug من categories
    const categoriesData = await graphqlClient.request(GET_CATEGORIES_QUERY);
    const foundCategory = categoriesData.rootCategories?.find(
      (cat) => cat.id === categoryFromQuery || cat.slug === categoryFromQuery
    );
    
    if (foundCategory?.slug) {
      // Redirect إلى path مع slug
      redirect(`/products/${foundCategory.slug}`);
    }
  }

  const { products, rootCategory } = await fetchAllProducts();

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
        rootCategory={rootCategory}
      />
    </Suspense>
  );
}
