// app/product-preview/[token]/page.js - Server Component for Product Preview
import { Suspense } from "react";
import { graphqlClient } from "@/app/lib/graphqlClient";
import { GET_PRODUCT_BY_SKU } from "@/app/lib/queries";
import ProductPageClient from "./ProductPageClient";
import Loader from "@/app/Componants/Loader";
import PreviewBadge from "./PreviewBadge";
import { Metadata } from "next";

// Helper function to validate preview token and fetch product data
async function getPreviewProduct(token) {
  try {
    // Call backend API to validate token and get product data
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/preview/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.success || !data.productSku) {
      return null;
    }

    // Fetch the full product data using existing GraphQL query
    const productData = await graphqlClient.request(GET_PRODUCT_BY_SKU, { 
      sku: data.productSku 
    });
    
    return {
      product: productData?.productBySku,
      previewData: {
        isValid: true,
        expiresAt: data.expiresAt,
        isPreview: true,
      }
    };
  } catch (error) {
    console.error("Preview validation error:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { product, previewData } = await getPreviewProduct(params.token);
  
  if (!product || !previewData?.isValid) {
    return {
      title: "Preview Not Found",
      robots: "noindex, nofollow",
    };
  }

  return {
    title: `Preview: ${product.name}`,
    description: product.description_en || product.description_ar || "Product preview",
    robots: "noindex, nofollow", // Important: prevent indexing of preview pages
    openGraph: {
      title: `Preview: ${product.name}`,
      description: product.description_en || product.description_ar || "Product preview",
      images: product.images?.[0] ? [product.images[0]] : [],
    },
  };
}

export default async function ProductPreviewPage({ params }) {
  const { product, previewData } = await getPreviewProduct(params.token);

  if (!product || !previewData?.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Preview Not Available</h1>
            <p className="text-gray-600 mb-4">
              This preview link has expired or is invalid.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your administrator for a new preview link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Add preview metadata to the product object
  const productWithPreview = {
    ...product,
    _preview: previewData,
  };

  return (
    <div className="relative">
      {/* Preview Badge */}
      <PreviewBadge expiresAt={previewData.expiresAt} />
      
      {/* Product Page with Preview Data */}
      <Suspense fallback={<Loader />}>
        <ProductPageClient product={productWithPreview} />
      </Suspense>
    </div>
  );
}
