import { Suspense } from "react";
import { graphqlClient } from "../../lib/graphqlClient";
import { PRODUCTS_BY_CATEGORY_QUERY, GET_CATEGORIES_QUERY } from "../../lib/queries";
import Loader from "../../Componants/Loader";
import ProductsClientPage from "../ProductsClientPage";

const fetchProductsByCategory = async (categorySlug) => {
  // 🟢 إذا لم يكن هناك category، اجلب جميع المنتجات
  if (!categorySlug) {
    try {
      const data = await graphqlClient.request(GET_CATEGORIES_QUERY);
      const products = data.products || [];
      products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { products, rootCategory: null };
    } catch (error) {
      console.error("Error fetching all products:", error);
      return { products: [], rootCategory: null };
    }
  }

  // 🔹 البحث عن category بالـ slug أولاً
  const categoriesData = await graphqlClient.request(GET_CATEGORIES_QUERY);
  const foundCategory = categoriesData.rootCategories?.find(
    (cat) => cat.slug === categorySlug
  );

  if (!foundCategory) {
    return { products: [], rootCategory: null };
  }

  // جلب المنتجات باستخدام categoryId
  const variables = { categoryId: foundCategory.id };
  const data = await graphqlClient.request(PRODUCTS_BY_CATEGORY_QUERY, variables);

  let products = data.rootCategory?.products || [];

  if (data.rootCategory?.subCategories) {
    data.rootCategory.subCategories.forEach((sub) => {
      if (sub.products) {
        products = [...products, ...sub.products];
      }
    });
  }

  products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return { products, rootCategory: data.rootCategory };
};

export default async function ProductsSlugPage({ params }) {
  const categorySlug = params?.slug || null;
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
      />
    </Suspense>
  );
}

