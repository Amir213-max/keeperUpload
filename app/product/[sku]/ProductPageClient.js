'use client';

import { useEffect } from "react";
import ProductPage from "./ProductPage";
import ProductDescription from "./ProductDescription";
import RecommendedSlider from "./RecommendedProducts";

export default function ProductPageClient({ product }) {
  useEffect(() => {
    if (product) {
      const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');

      // حذف أي منتج بنفس الـ sku
      const filtered = stored.filter((p) => p.sku !== product.sku);

      // إضافة المنتج الحالي في البداية
      const updated = [product, ...filtered].slice(0, 10);

      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    }
  }, [product]);

  return (
    <div>
      {/* Main Product Page */}
      <ProductPage product={product} />

      {/* Product Description */}
      <div className="mx-auto bg-white px-2 sm:px-2 md:px-4 lg:px-3 py-3">
        <div className="max-w-7xl mx-auto">
          <ProductDescription product={product} />
        </div>
      </div>

      {/* Recommended Products */}
      <div className="mx-auto bg-white px-2 sm:px-3 md:px-4 lg:px-3 pb-4">
        <div className="max-w-7xl mx-auto">
          <RecommendedSlider productId={product.id} />
        </div>
      </div>
    </div>
  );
}
