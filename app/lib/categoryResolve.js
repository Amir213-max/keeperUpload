/**
 * Resolve RootCategory rows from GET_CATEGORIES_ONLY_QUERY by slug.
 */

/**
 * @param {Array<{ id: string; slug?: string | null; name?: string }>|undefined|null} rootCategories
 * @param {string} slug
 * @returns {{ id: string; slug?: string; name?: string } | null}
 */
export function findRootCategoryBySlug(rootCategories, slug) {
  if (!slug || !Array.isArray(rootCategories)) return null;
  const normalized = String(slug).trim();
  let c = rootCategories.find((x) => x?.slug === normalized);
  if (!c) {
    const lower = normalized.toLowerCase();
    c = rootCategories.find((x) => String(x?.slug ?? "").toLowerCase() === lower);
  }
  return c || null;
}

/**
 * Flatten roots + subCategories for sidebar and slug lookup (sub gets `parent` for UI).
 * @param {Array<{ id: string; slug?: string | null; name?: string; subCategories?: Array<{ id: string; slug?: string | null; name?: string }> }>|undefined|null} rootCategories
 */
export function flattenCategoriesWithParentRefs(rootCategories) {
  if (!Array.isArray(rootCategories)) return [];
  const out = [];
  for (const root of rootCategories) {
    if (!root) continue;
    out.push(root);
    for (const sub of root.subCategories || []) {
      if (!sub) continue;
      out.push({
        ...sub,
        parent: { id: root.id, name: root.name, slug: root.slug },
      });
    }
  }
  return out;
}

/**
 * Resolve root OR subcategory by slug for listing (Query.productsWithFilters category_id).
 * @returns {{ category: { id: string; slug?: string | null; name?: string }; parentRoot: { id: string; slug?: string | null; name?: string } } | null}
 */
export function findCategoryBySlugForListing(rootCategories, slug) {
  if (!slug || !Array.isArray(rootCategories)) return null;
  const normalized = String(slug).trim();
  const lower = normalized.toLowerCase();

  for (const root of rootCategories) {
    if (!root) continue;
    const rs = root.slug;
    if (rs === normalized || String(rs ?? "").toLowerCase() === lower) {
      return { category: root, parentRoot: root };
    }
    for (const sub of root.subCategories || []) {
      if (!sub) continue;
      const ss = sub.slug;
      if (ss === normalized || String(ss ?? "").toLowerCase() === lower) {
        return { category: sub, parentRoot: root };
      }
    }
  }
  return null;
}
