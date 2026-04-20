/**
 * Build filter facet data (unique values + per-value product counts) from a product list.
 * Used for category listings (after paginating productsWithFilters) and brand pages.
 *
 * Each product counts once per (attribute label, value). Duplicate attribute rows
 * on the same product only increment once.
 *
 * @param {any[]} products
 * @returns {{ brands: string[]; attributeValues: Array<{ attribute: string; values: string[]; countsByValue: Record<string, number> }> }}
 */
export function buildListingAttributeFacetsFromProducts(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { brands: [], attributeValues: [] };
  }

  /** @type {Map<string, Map<string, number>>} */
  const countMap = new Map();
  const brandNames = new Set();

  const increment = (attrLabel, value) => {
    if (!attrLabel || value == null || value === "") return;
    const v = String(value);
    if (!countMap.has(attrLabel)) countMap.set(attrLabel, new Map());
    const inner = countMap.get(attrLabel);
    inner.set(v, (inner.get(v) || 0) + 1);
  };

  for (const product of products) {
    /** @type {Map<string, Set<string>>} */
    const seenPerAttr = new Map();

    const markSeen = (attrLabel, value) => {
      if (!attrLabel || value == null || value === "") return false;
      const v = String(value);
      if (!seenPerAttr.has(attrLabel)) seenPerAttr.set(attrLabel, new Set());
      const set = seenPerAttr.get(attrLabel);
      if (set.has(v)) return false;
      set.add(v);
      return true;
    };

    product.productAttributeValues?.forEach((attr) => {
      const label = attr.attribute?.label;
      const key = attr.key;
      if (label && key != null && key !== "" && markSeen(label, key)) {
        increment(label, key);
      }
    });

    const bn = product.brand_name;
    if (bn && markSeen("Brand", bn)) {
      brandNames.add(String(bn));
      increment("Brand", bn);
    }
  }

  const attributeValues = [...countMap.entries()].map(([attribute, valueCountMap]) => {
    const pairs = [...valueCountMap.entries()];
    pairs.sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), undefined, { sensitivity: "base" }));
    const values = pairs.map(([v]) => v);
    const countsByValue = Object.fromEntries(pairs);
    return { attribute, values, countsByValue };
  });

  const brands = [...brandNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return { brands, attributeValues };
}
