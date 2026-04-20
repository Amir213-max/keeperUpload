import { flattenCategoriesWithParentRefs, findCategoryBySlugForListing } from "./categoryResolve";

/**
 * For /products/[slug]/... : resolve the root row (has brand_category_covers from CMS)
 * and the selected leaf (root or sub) for image / filter context.
 *
 * @param {any[]} categories - rootCategories from GET_CATEGORIES_ONLY_QUERY
 * @param {string|null|undefined} selectedCategoryId
 * @param {string|null|undefined} productsPathFirstSlug - first path segment after /products/
 */
export function getProductsListingBannerContext(
  categories,
  selectedCategoryId,
  productsPathFirstSlug
) {
  const roots = Array.isArray(categories) ? categories : [];
  const empty = { rootForMeta: null, selectedLeaf: null };
  if (!roots.length) return empty;

  const flat = flattenCategoriesWithParentRefs(roots);
  let selectedLeaf =
    selectedCategoryId != null && selectedCategoryId !== ""
      ? flat.find((c) => String(c.id) === String(selectedCategoryId)) ?? null
      : null;

  const slug =
    productsPathFirstSlug && String(productsPathFirstSlug).trim() !== ""
      ? decodeURIComponent(String(productsPathFirstSlug).trim())
      : null;

  if (!selectedLeaf && slug) {
    const hit = findCategoryBySlugForListing(roots, slug);
    selectedLeaf = hit?.category ?? null;
  }

  let rootForMeta = null;
  if (selectedLeaf?.parent?.id != null) {
    rootForMeta = roots.find((r) => String(r.id) === String(selectedLeaf.parent.id)) ?? null;
  } else if (selectedLeaf && roots.some((r) => String(r.id) === String(selectedLeaf.id))) {
    rootForMeta = selectedLeaf;
  } else if (slug) {
    const hit = findCategoryBySlugForListing(roots, slug);
    rootForMeta = hit?.parentRoot ?? null;
  }

  return { rootForMeta, selectedLeaf };
}
