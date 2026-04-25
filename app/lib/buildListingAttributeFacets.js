/**
 * Build filter facet data (unique values + per-value product counts) from a product list.
 * Used for category listings (after paginating productsWithFilters) and brand pages.
 *
 * Each product counts once per (attribute label, value). Duplicate attribute rows
 * on the same product only increment once. Attribute names and values are merged
 * case-insensitively so "Color" / "color" do not create duplicate filter groups.
 *
 * @param {any[]} products
 * @returns {{ brands: string[]; attributeValues: Array<{ attribute: string; values: string[]; countsByValue: Record<string, number> }> }}
 */
export function buildListingAttributeFacetsFromProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { brands: [], attributeValues: [] };
  }

  const norm = (s) => String(s ?? "").trim().toLowerCase();

  /** normAttr -> Map(normVal -> count) */
  const countByAttrVal = new Map();
  /** normAttr -> display attribute label (first seen wins) */
  const attrLabelByNorm = new Map();
  /** normAttr -> Map(normVal -> display value) */
  const valDisplayByNorm = new Map();

  const ensureAttr = (normAttr, displayAttr) => {
    if (!countByAttrVal.has(normAttr)) {
      countByAttrVal.set(normAttr, new Map());
      valDisplayByNorm.set(normAttr, new Map());
    }
    if (!attrLabelByNorm.has(normAttr)) {
      attrLabelByNorm.set(normAttr, String(displayAttr ?? "").trim() || normAttr);
    }
  };

  const addCount = (normAttr, normVal, displayAttr, displayVal) => {
    if (!normAttr || normVal === "") return;
    ensureAttr(normAttr, displayAttr);
    const inner = countByAttrVal.get(normAttr);
    const vd = valDisplayByNorm.get(normAttr);
    if (!vd.has(normVal)) {
      vd.set(normVal, String(displayVal ?? "").trim() || normVal);
    }
    inner.set(normVal, (inner.get(normVal) || 0) + 1);
  };

  const brandNames = new Set();
  const BRAND_NORM = "brand";

  for (const product of products) {
    /** normAttr -> Set(normVal) — one increment per product per (attr, value) */
    const seenThisProduct = new Map();

    const markOnce = (normAttr, normVal) => {
      if (!seenThisProduct.has(normAttr)) seenThisProduct.set(normAttr, new Set());
      const s = seenThisProduct.get(normAttr);
      if (s.has(normVal)) return false;
      s.add(normVal);
      return true;
    };

    for (const attr of product.productAttributeValues || []) {
      const rawLabel = attr.attribute?.label || attr.attribute?.key;
      const key = attr.key;
      if (key == null || key === "") continue;
      const na = norm(rawLabel);
      if (!na) continue;
      const nv = norm(key);
      if (!nv) continue;
      if (!markOnce(na, nv)) continue;
      addCount(na, nv, String(rawLabel ?? "").trim(), String(key).trim());
    }

    const bn = product.brand_name || product.brand?.name;
    if (bn) {
      const nBrand = norm(bn);
      if (markOnce(BRAND_NORM, nBrand)) {
        brandNames.add(String(bn).trim());
        addCount(BRAND_NORM, nBrand, "Brand", String(bn).trim());
      }
    }
  }

  const attributeValues = [...countByAttrVal.entries()].map(([normAttr, valCountMap]) => {
    const displayAttr = attrLabelByNorm.get(normAttr) || normAttr;
    const vd = valDisplayByNorm.get(normAttr) || new Map();
    const pairs = [...valCountMap.entries()].map(([normVal, c]) => [vd.get(normVal) || normVal, c]);
    pairs.sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), undefined, { sensitivity: "base" }));
    const values = pairs.map(([v]) => v);
    const countsByValue = Object.fromEntries(pairs);
    return { attribute: displayAttr, values, countsByValue };
  });

  attributeValues.sort((a, b) =>
    String(a.attribute).localeCompare(String(b.attribute), undefined, { sensitivity: "base" })
  );

  const brands = [...brandNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return { brands, attributeValues };
}
