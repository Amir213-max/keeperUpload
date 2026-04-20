"use client";

/**
 * Shared full-width listing banner (category image or brand-in-category hero).
 * Same layout everywhere: one slot below the title.
 */
export default function CategoryListingBanner({ src, alt = "", className = "" }) {
  if (!src) return null;
  return (
    <div className={`w-full mb-4 ${className}`.trim()} aria-label="Category banner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-auto object-cover" />
    </div>
  );
}
