'use client';

import { useEffect } from "react";
import dynamic from "next/dynamic";
import ProductPage from "@/app/product/[sku]/ProductPage";
import ProductDescription from "@/app/product/[sku]/ProductDescription";
import PreviewActions from "./PreviewActions";

const RecommendedSlider = dynamic(() => import("@/app/product/[sku]/RecommendedProducts"), {
  ssr: false,
});

export default function ProductPreviewPageClient({ product }) {
  const isPreview = product?._preview?.isPreview;

  useEffect(() => {
    // Don't add preview products to recently viewed
    if (product && !isPreview) {
      const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

      // Remove any product with the same sku
      const filtered = stored.filter((p) => p.sku !== product.sku);

      // Add current product at the beginning
      const updated = [product, ...filtered].slice(0, 10);

      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    }
  }, [product, isPreview]);

  return (
    <div>
      {/* Preview Actions Bar */}
      {isPreview && <PreviewActions product={product} />}

      {/* Main Product Page */}
      <ProductPage product={product} />

      {/* Product Description */}
      <div className="mx-auto bg-white px-2 sm:px-2 md:px-4 lg:px-3 py-3">
        <div className="max-w-7xl mx-auto">
          <ProductDescription product={product} />
        </div>
      </div>

      {/* Recommended Products - Hidden in preview mode */}
      {!isPreview && (
        <div className="mx-auto bg-white px-2 sm:px-3 md:px-4 lg:px-3 pb-4">
          <div className="max-w-7xl mx-auto">
            <RecommendedSlider productId={product.id} />
          </div>
        </div>
      )}
    </div>
  );
}
