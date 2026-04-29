"use client";
import Image from "next/image";

/**
 * Shared full-width listing banner (category image or brand-in-category hero).
 * Same layout everywhere: one slot below the title.
 */
export default function CategoryListingBanner({ src, alt = "", className = "" }) {
  if (!src) return null;
  return (
    <div className={`w-full mb-4 ${className}`.trim()} aria-label="Category banner">
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={500}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"
        className="w-full h-auto object-cover"
      />
    </div>
  );
}
