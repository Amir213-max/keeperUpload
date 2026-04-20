"use client";

import { useMemo } from "react";
import CategoryListingBanner from "./CategoryListingBanner";

/** يطابق اسم البراند مع حقل brand_name في المنتجات عندما يكون الاسم JSON مترجمًا */
export function brandNameForFilter(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  try {
    const p = JSON.parse(s);
    if (p && typeof p === "object") {
      return p.en || p.ar || p.name || s;
    }
  } catch {
    /* plain string */
  }
  return s;
}

function normalizeBrandCompare(value) {
  const v = brandNameForFilter(value);
  if (v == null || v === "") return "";
  return String(v).toLowerCase().trim();
}

/** هل اسم البراند في الصف يطابق الفلتر (اسم عرض أو id) */
export function coverMatchesSelectedBrand(row, selectedBrand) {
  if (!row || !selectedBrand) return false;
  const sb = String(selectedBrand).trim();
  if (!sb) return false;
  if (row.brand?.id != null && String(row.brand.id) === sb) return true;
  const a = normalizeBrandCompare(row.brand?.name);
  const b = normalizeBrandCompare(sb);
  if (a && b && a === b) return true;
  return String(row.brand?.name ?? "")
    .toLowerCase()
    .trim() === sb.toLowerCase();
}

/**
 * تصفية أغلفة البراند حسب التصنيف الحالي (فرعي أو جذر).
 */
export function filterBrandCategoryCoversForListing(covers, selectedCategoryId, rootCategoryId) {
  if (!Array.isArray(covers) || covers.length === 0) return [];
  if (selectedCategoryId == null || selectedCategoryId === "") return covers;
  const sid = String(selectedCategoryId);
  const withCategory = covers.filter((c) => c?.category?.id != null);
  if (withCategory.length === 0) return covers;
  const matched = covers.filter((c) => String(c?.category?.id) === sid);
  if (matched.length > 0) return matched;
  if (rootCategoryId != null && String(rootCategoryId) === sid) return covers;
  return covers;
}

/** URL لعرض غلاف براند–تصنيف (مسار تخزين أو cover_url مطلق). */
export function getBrandCategoryCoverImageUrl(row, getImageUrl) {
  if (!row || typeof getImageUrl !== "function") return null;
  if (row.cover_url && /^https?:\/\//i.test(String(row.cover_url).trim())) {
    return String(row.cover_url).trim();
  }
  return getImageUrl(row.cover);
}

/** أول صف غلاف يطابق البراند المختار (للبوابة مع بانر التصنيف). */
export function findBrandCategoryHeroRow(covers, selectedBrand, options = {}) {
  if (!selectedBrand || !Array.isArray(covers) || covers.length === 0) return null;
  const { selectedCategoryId, rootCategoryId } = options;
  const listing = filterBrandCategoryCoversForListing(covers, selectedCategoryId, rootCategoryId);
  return listing.find((row) => coverMatchesSelectedBrand(row, selectedBrand)) || null;
}

/**
 * غلاف البراند داخل التصنيف: يظهر فقط عند اختيار براند (مثل بانر التصنيف).
 * في «عرض الكل» بدون فلتر براند لا يُعرض شيء هنا — صورة التصنيف تبقى في الصفحة الأم.
 */
export default function BrandCategoryCovers({
  covers = [],
  getImageUrl,
  selectedBrand = null,
  selectedCategoryId = null,
  rootCategoryId = null,
}) {
  const heroRow = useMemo(
    () =>
      selectedBrand
        ? findBrandCategoryHeroRow(covers, selectedBrand, {
            selectedCategoryId,
            rootCategoryId,
          })
        : null,
    [covers, selectedBrand, selectedCategoryId, rootCategoryId]
  );

  if (!Array.isArray(covers) || covers.length === 0) return null;
  if (typeof getImageUrl !== "function") return null;
  if (!selectedBrand) return null;

  if (!heroRow) return null;
  const url = getBrandCategoryCoverImageUrl(heroRow, getImageUrl);
  if (!url) return null;
  const alt = heroRow.brand?.name ? String(heroRow.brand.name) : "";

  return <CategoryListingBanner src={url} alt={alt} />;
}
