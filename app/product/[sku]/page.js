// ✅ app/product/[sku]/page.js  (Server Component)
import { Suspense } from "react";
import { graphqlClient } from "@/app/lib/graphqlClient";
import { GET_PRODUCT_BY_SKU } from "@/app/lib/queries";
import ProductPageClient from "./ProductPageClient";
import Loader from "@/app/Componants/Loader";

export default async function ProductPageSku({ params }) {
  const sku = decodeURIComponent(params.sku);

  let product = null;

  try {
    const res = await graphqlClient.request(GET_PRODUCT_BY_SKU, { sku });
    product = res?.productBySku;
  } catch (error) {
    console.error("❌ GraphQL Error:", error);
  }

  if (!product) {
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Product not found for SKU: <b>{sku}</b>
      </div>
    );
  }

  // ✅ مرّر الداتا للـ Client Component
  return (
    <Suspense fallback={<Loader />}>
      <ProductPageClient product={product} />
    </Suspense>
  );
}
