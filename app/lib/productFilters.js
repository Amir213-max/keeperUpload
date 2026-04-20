/**
 * Build ProductFiltersInput for Query.productsWithFilters (schema.graphql).
 * Never includes min_price / max_price (backend list_price column issue).
 *
 * Schema: input ProductFiltersInput { brand_id, category_id, search, ... }
 */

/**
 * @param {{ categoryId: string; brandId?: string | null; search?: string | null }} opts
 */
export function buildProductFilters({ categoryId, brandId, search }) {
  if (!categoryId) {
    throw new Error("buildProductFilters: categoryId is required");
  }
  /** @type {{ category_id: string; brand_id?: string; search?: string }} */
  const filters = { category_id: String(categoryId) };
  if (brandId != null && String(brandId).trim() !== "") {
    filters.brand_id = String(brandId);
  }
  if (search != null && String(search).trim() !== "") {
    filters.search = String(search).trim();
  }
  return filters;
}

/** @param {string|number|null|undefined} brandId */
export function isNumericBrandId(brandId) {
  return /^\d+$/.test(String(brandId ?? "").trim());
}
