// ✅ app/product/[sku]/page.js  (Server Component)
import { Suspense } from "react";
import { graphqlClient } from "@/app/lib/graphqlClient";
import { GET_PRODUCT_BY_SKU, GET_PRODUCT_BY_SKU_NO_VARIANTS } from "@/app/lib/queries";
import ProductPageClient from "./ProductPageClient";
import Loader from "@/app/Componants/Loader";

export default async function ProductPageSku({ params }) {
  const sku = decodeURIComponent(params.sku);

  let product = null;
  let errorMessage = null;

  try {
    console.log("🔍 Fetching product for SKU:", sku);
    const res = await graphqlClient.request(GET_PRODUCT_BY_SKU, { sku });
    console.log("📦 GraphQL Response:", { sku, hasResponse: !!res, productBySku: !!res?.productBySku, responseKeys: res ? Object.keys(res) : [] });
    
    product = res?.productBySku;
    
    // If product is null but we got a response, try fallback query without variants
    if (!product && res) {
      console.warn("⚠️ Product query returned but productBySku is null, trying fallback query without variants:", { 
        sku, 
        res, 
        responseKeys: Object.keys(res || {}),
      });
      
      // Check if there's a product field instead of productBySku (different query structure)
      if (res.product) {
        console.log("✅ Found product under 'product' field instead of 'productBySku'");
        product = res.product;
      } else {
        // Try fallback query without variants
        try {
          console.log("🔄 Trying fallback query without variants for SKU:", sku);
          const fallbackRes = await graphqlClient.request(GET_PRODUCT_BY_SKU_NO_VARIANTS, { sku });
          product = fallbackRes?.productBySku;
          if (product) {
            console.log("✅ Successfully fetched product using fallback query (no variants)");
            // Set variants to empty array since we didn't fetch them
            product.variants = [];
          }
        } catch (fallbackError) {
          console.error("❌ Fallback query also failed:", fallbackError);
        }
      }
    }
  } catch (error) {
    console.error("❌ GraphQL Error for SKU:", sku);
    console.error("Error details:", {
      message: error.message,
      response: error.response,
      data: error.data,
    });
    errorMessage = error.message || "Failed to fetch product";
    
    // Try to extract product from error response if available
    if (error.response?.data) {
      product = error.response.data.productBySku || error.response.data.product;
      if (product) {
        console.log("✅ Recovered product from error.response.data for SKU:", sku);
      } else {
        console.warn("⚠️ error.response.data exists but no product found");
      }
    }
    
    // Also check if error has any data property directly
    if (error.data) {
      product = error.data.productBySku || error.data.product;
      if (product) {
        console.log("✅ Recovered product from error.data for SKU:", sku);
      }
    }
    
    // If still no product, try fallback query without variants
    if (!product) {
      try {
        console.log("🔄 Trying fallback query without variants after error for SKU:", sku);
        const fallbackRes = await graphqlClient.request(GET_PRODUCT_BY_SKU_NO_VARIANTS, { sku });
        product = fallbackRes?.productBySku;
        if (product) {
          console.log("✅ Successfully fetched product using fallback query (no variants) after error");
          product.variants = [];
        }
      } catch (fallbackError) {
        console.error("❌ Fallback query also failed after error:", fallbackError);
      }
    }
  }

  if (!product) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 font-semibold mb-2">
          Product not found for SKU: <b>{sku}</b>
        </div>
        {errorMessage && (
          <div className="text-sm text-gray-500 mt-2">
            Error: {errorMessage}
          </div>
        )}
        <div className="text-sm text-gray-400 mt-4">
          Please check the SKU and try again.
        </div>
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
