/**
 * URL Slug Helper for SEO-friendly URLs
 * 
 * Converts attribute names and values to SEO-friendly slugs
 * for use in URLs, making them shareable and SEO-optimized.
 */

/**
 * Convert a string to a URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes multiple consecutive hyphens
 * @param {string} str - String to convert
 * @returns {string} - URL-friendly slug
 */
export function toSlug(str) {
  if (!str) return "";
  
  return String(str)
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, "")
    // Remove multiple consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

/**
 * Convert a slug back to a readable string
 * @param {string} slug - Slug to convert
 * @returns {string} - Readable string
 */
export function fromSlug(slug) {
  if (!slug) return "";
  
  return String(slug)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Convert attribute name to URL-friendly format
 * Removes "attr_" prefix and converts to slug
 * @param {string} attrName - Attribute name (e.g., "Size", "Color")
 * @returns {string} - URL-friendly attribute name (e.g., "size", "color")
 */
export function attributeNameToSlug(attrName) {
  if (!attrName) return "";
  
  // Remove "attr_" prefix if present
  const cleanName = attrName.replace(/^attr_/i, "");
  
  return toSlug(cleanName);
}

/**
 * Convert URL slug back to attribute name
 * @param {string} slug - URL slug (e.g., "size", "color")
 * @returns {string} - Original attribute name format
 */
export function slugToAttributeName(slug) {
  if (!slug) return "";
  
  // Convert from slug to readable format
  // Keep as-is since we don't need the "attr_" prefix in state
  return fromSlug(slug);
}

/**
 * Convert attribute values array to URL-friendly format
 * Joins multiple values with hyphens
 * @param {string[]} values - Array of attribute values (e.g., ["Large", "Medium"])
 * @returns {string} - URL-friendly value string (e.g., "large-medium")
 */
export function attributeValuesToSlug(values) {
  if (!values || !Array.isArray(values) || values.length === 0) return "";
  
  return values
    .map((val) => toSlug(String(val)))
    .filter((slug) => slug.length > 0)
    .join("-");
}

/**
 * Convert URL slug back to attribute values array
 * @param {string} slug - URL slug (e.g., "large-medium")
 * @returns {string[]} - Array of attribute values (e.g., ["Large", "Medium"])
 */
export function slugToAttributeValues(slug) {
  if (!slug) return [];
  
  // Split by hyphen and convert back to readable format
  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => fromSlug(part));
}

/**
 * Build SEO-friendly URL from filters
 * @param {string} basePath - Base path (e.g., "/products" or "/products/category-slug")
 * @param {object} filters - Filter object with brand, category, and attributes
 * @returns {string} - SEO-friendly URL
 */
export function buildFilterUrl(basePath, filters = {}) {
  const params = new URLSearchParams();
  
  // Add brand if present
  if (filters.brand) {
    params.set("brand", toSlug(filters.brand));
  }
  
  // Add attributes as SEO-friendly slugs
  if (filters.attributes && typeof filters.attributes === "object") {
    Object.entries(filters.attributes).forEach(([attrName, values]) => {
      if (values && Array.isArray(values) && values.length > 0) {
        const slugName = attributeNameToSlug(attrName);
        const slugValues = attributeValuesToSlug(values);
        if (slugName && slugValues) {
          params.set(slugName, slugValues);
        }
      }
    });
  }
  
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Parse SEO-friendly URL to filters
 * @param {URLSearchParams} searchParams - URL search params
 * @returns {object} - Filter object with brand, category, and attributes
 */
export function parseFilterUrl(searchParams) {
  const filters = {
    brand: null,
    attributes: {},
  };
  
  // Parse brand
  const brandSlug = searchParams.get("brand");
  if (brandSlug) {
    filters.brand = fromSlug(brandSlug);
  }
  
  // Parse attributes
  // We need to match attribute names from URL slugs to actual attribute labels
  // This requires the attributeValues array to match slugs to labels
  for (const [key, value] of searchParams.entries()) {
    // Skip brand as it's already handled
    if (key === "brand" || key === "category") continue;
    
    // Convert slug back to attribute values
    const attrValues = slugToAttributeValues(value);
    if (attrValues.length > 0) {
      // We'll need to match the slug to the actual attribute name
      // For now, store with the slug as key - will be matched later
      filters.attributes[key] = attrValues;
    }
  }
  
  return filters;
}

/**
 * Match URL slug to actual attribute name from attributeValues
 * @param {string} slug - URL slug (e.g., "size")
 * @param {Array} attributeValues - Array of attribute objects with attribute.label
 * @returns {string|null} - Actual attribute name or null if not found
 */
export function matchSlugToAttributeName(slug, attributeValues) {
  if (!slug || !attributeValues || !Array.isArray(attributeValues)) return null;
  
  // Normalize slug to lowercase for comparison
  const normalizedSlug = slug.toLowerCase().trim();
  
  // Try to find matching attribute by comparing slugs (case-insensitive)
  for (const attrObj of attributeValues) {
    const attrLabel = attrObj.attribute;
    if (!attrLabel) continue;
    
    const attrSlug = attributeNameToSlug(attrLabel);
    if (attrSlug && attrSlug.toLowerCase().trim() === normalizedSlug) {
      return attrLabel;
    }
  }
  
  return null;
}

/**
 * Build URL with path segments for attributes
 * Format: /products/[category-slug]/[first-attr-value]/[attr-name]-[attr-value]/...
 * Example: /products/goalkeeper-jerseys/black/size-large
 * @param {string} categorySlug - Category slug
 * @param {object} attributes - Attributes object { "Color": ["Black"], "Size": ["Large"] }
 * @param {string} brand - Brand name (optional, will be added as query param)
 * @returns {string} - URL with path segments
 */
export function buildPathSegmentUrl(categorySlug, attributes = {}, brand = null, page = null) {
  // ⚠️ /products route has been removed - must have a categorySlug
  // If no categorySlug, return null or empty string to prevent navigation
  if (!categorySlug) {
    console.warn("⚠️ buildPathSegmentUrl called without categorySlug - /products route is removed");
    return null; // Return null to prevent navigation to removed route
  }
  
  let path = `/products/${encodeURIComponent(categorySlug)}`;
  
  // Sort attributes: Color first (if exists), then others
  const sortedAttrs = Object.entries(attributes).sort(([a], [b]) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === "color") return -1;
    if (bLower === "color") return 1;
    return a.localeCompare(b);
  });
  
  // Add first attribute value directly (usually color)
  let firstAttrAdded = false;
  const pathSegments = [];
  
  // 🔹 Handle Brand attribute separately - add brands as brand-brandname segments
  if (attributes["Brand"] && attributes["Brand"].length > 0) {
    attributes["Brand"].forEach((brandValue) => {
      const brandSlug = toSlug(brandValue);
      pathSegments.push(`brand-${brandSlug}`);
    });
  }
  
  sortedAttrs.forEach(([attrName, values]) => {
    if (!values || values.length === 0) return;
    // Skip Brand attribute as it's handled separately above
    if (attrName === "Brand") return;
    
    const attrSlug = attributeNameToSlug(attrName);
    const attrLower = attrName.toLowerCase();
    
    // First attribute (usually color) - add value directly without name
    if (!firstAttrAdded && attrLower === "color" && values.length === 1) {
      pathSegments.push(toSlug(values[0]));
      firstAttrAdded = true;
    } else {
      // Other attributes - add as attr-name-attr-value
      values.forEach((value) => {
        const valueSlug = toSlug(value);
        pathSegments.push(`${attrSlug}-${valueSlug}`);
      });
    }
  });
  
  if (pathSegments.length > 0) {
    path += "/" + pathSegments.join("/");
  }
  
  // Build query parameters
  const queryParams = [];
  // Only add brand as query param if it's a single brand and not in attributes["Brand"]
  if (brand && (!attributes["Brand"] || attributes["Brand"].length === 0)) {
    queryParams.push(`brand=${toSlug(brand)}`);
  }
  if (page && page > 1) {
    queryParams.push(`page=${page}`);
  }
  
  if (queryParams.length > 0) {
    path += `?${queryParams.join("&")}`;
  }
  
  return path;
}

/**
 * Build URL with path segments for parent pages (like /GoalkeeperApparel)
 * Format: /[parent-page]/[first-attr-value]/[attr-name]-[attr-value]/...
 * Example: /GoalkeeperApparel/black/size-large?brand=nike
 * @param {string} basePath - Base path (e.g., "/GoalkeeperApparel")
 * @param {object} attributes - Attributes object { "Color": ["Black"], "Size": ["Large"] }
 * @param {string} brand - Brand name (optional, will be added as query param)
 * @returns {string} - URL with path segments
 */
/**
 * Build URL with query parameters for parent pages (like /GoalkeeperApparel)
 * Format: /[parent-page]?brand=nike&color=black&size=large
 * 🔹 Using query parameters instead of path segments to prevent page reload
 * @param {string} basePath - Base path (e.g., "/GoalkeeperApparel")
 * @param {object} attributes - Attributes object { "Color": ["Black"], "Size": ["Large"] }
 * @param {string} brand - Brand name (optional)
 * @returns {string} - URL with query parameters
 */
export function buildParentPageUrl(basePath, attributes = {}, brand = null) {
  if (!basePath) {
    return null;
  }
  
  const normalizedBase = basePath.startsWith("/") ? basePath : `/${basePath}`;
  let path = normalizedBase;
  
  // Sort attributes: Color first (if exists), then others
  const sortedAttrs = Object.entries(attributes).sort(([a], [b]) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === "color") return -1;
    if (bLower === "color") return 1;
    return a.localeCompare(b);
  });
  
  const pathSegments = [];
  
  // 🔹 Handle Brand attribute separately - add brands as brand-brandname segments (before single brand)
  if (attributes["Brand"] && attributes["Brand"].length > 0) {
    attributes["Brand"].forEach((brandValue) => {
      const brandSlug = toSlug(brandValue);
      pathSegments.push(`brand-${brandSlug}`);
    });
  }
  
  // Add single brand as brand-brandname segment (if exists and no Brand attribute)
  if (brand && (!attributes["Brand"] || attributes["Brand"].length === 0)) {
    const brandSlug = toSlug(brand);
    pathSegments.push(`brand-${brandSlug}`);
  }
  
  // Add first attribute value directly (usually color)
  let firstAttrAdded = false;
  sortedAttrs.forEach(([attrName, values]) => {
    if (!values || values.length === 0) return;
    // Skip Brand attribute as it's handled separately above
    if (attrName === "Brand") return;
    
    const attrSlug = attributeNameToSlug(attrName);
    const attrLower = attrName.toLowerCase();
    
    // First attribute (usually color) - add first value directly without name
    if (!firstAttrAdded && attrLower === "color" && values.length > 0) {
      pathSegments.push(toSlug(values[0]));
      firstAttrAdded = true;
      
      // Add remaining color values as color-value
      if (values.length > 1) {
        for (let i = 1; i < values.length; i++) {
          const valueSlug = toSlug(values[i]);
          pathSegments.push(`${attrSlug}-${valueSlug}`);
        }
      }
    } else {
      // Other attributes - add as attr-name-attr-value
      values.forEach((value) => {
        const valueSlug = toSlug(value);
        pathSegments.push(`${attrSlug}-${valueSlug}`);
      });
    }
  });
  
  // Append path segments to base path (no ? or =)
  if (pathSegments.length > 0) {
    path += "/" + pathSegments.join("/");
  }
  
  return path;
}

/**
 * Parse path segments to attributes
 * Format: /products/[category-slug]/[first-attr-value]/[attr-name]-[attr-value]/...
 * @param {string[]} pathSegments - Array of path segments (e.g., ["black", "size-large"])
 * @param {Array} attributeValues - Array of attribute objects to match against
 * @param {Array} brands - Optional array of brand objects to exclude from attribute matching
 * @returns {object} - Attributes object { "Color": ["Black"], "Size": ["Large"] }
 */
export function parsePathSegments(pathSegments = [], attributeValues = [], brands = []) {
  const attributes = {};
  
  if (!pathSegments || pathSegments.length === 0) return attributes;
  
  // Build a map of attribute names to their slugs
  const attrNameToSlugMap = {};
  const attrSlugToNameMap = {};
  attributeValues.forEach((attrObj) => {
    const attrLabel = attrObj.attribute;
    if (attrLabel) {
      const slug = attributeNameToSlug(attrLabel);
      attrNameToSlugMap[attrLabel] = slug;
      attrSlugToNameMap[slug] = attrLabel;
    }
  });
  
  // Build a map of attribute values to their actual values
  // Format: { "Color": { "black": "Black", "white": "White" }, ... }
  const attrValueMap = {};
  attributeValues.forEach((attrObj) => {
    const attrLabel = attrObj.attribute;
    if (attrLabel && attrObj.values) {
      if (!attrValueMap[attrLabel]) {
        attrValueMap[attrLabel] = {};
      }
      attrObj.values.forEach((val) => {
        const valSlug = toSlug(val);
        attrValueMap[attrLabel][valSlug] = val;
      });
    }
  });
  
  // Build brand slug map for brand attribute handling
  // Support both array of strings and array of objects
  const brandSlugMap = {};
  if (brands && brands.length > 0) {
    brands.forEach((brand) => {
      let brandName = null;
      if (typeof brand === 'string') {
        brandName = brand;
      } else if (brand && brand.brand_name) {
        brandName = brand.brand_name;
      } else if (brand && brand.name) {
        brandName = brand.name;
      }
      if (brandName) {
        const brandSlug = toSlug(brandName).toLowerCase();
        brandSlugMap[brandSlug] = brandName;
      }
    });
  }

  // Process each segment
  pathSegments.forEach((segment) => {
    const segmentLower = segment.toLowerCase();
    
    // 🔹 Handle brand segments with "brand-" prefix as Brand attribute
    if (segmentLower.startsWith("brand-")) {
      const brandSlug = segmentLower.substring(6); // Remove "brand-" prefix (already lowercase)
      const brandName = fromSlug(brandSlug);
      
      // Verify brand exists in brands list if available
      if (brands && brands.length > 0) {
        // Use lowercase for matching
        const brandSlugLower = brandSlug.toLowerCase();
        if (brandSlugMap[brandSlugLower]) {
          // Add to Brand attribute instead of skipping
          if (!attributes["Brand"]) {
            attributes["Brand"] = [];
          }
          if (!attributes["Brand"].includes(brandSlugMap[brandSlugLower])) {
            attributes["Brand"].push(brandSlugMap[brandSlugLower]);
          }
        }
      } else {
        // If brands list not available, add brand name directly
        if (!attributes["Brand"]) {
          attributes["Brand"] = [];
        }
        if (!attributes["Brand"].includes(brandName)) {
          attributes["Brand"].push(brandName);
        }
      }
      return; // Skip further processing for brand segments
    }
    
    // Check if segment is a brand (without "brand-" prefix) - exclude from attributes
    // This will be handled by parseBrandFromPathSegments for single brand
    if (brands && brands.length > 0) {
      if (brandSlugMap[segmentLower]) {
        // This is a brand without prefix, skip it (will be handled by parseBrandFromPathSegments)
        return;
      }
    }
    
    // Try to match as "attr-name-attr-value" format first
    let matched = false;
    for (const [attrSlug, attrName] of Object.entries(attrSlugToNameMap)) {
      if (segmentLower.startsWith(attrSlug + "-")) {
        // Found attribute name prefix
        const valueSlug = segmentLower.substring(attrSlug.length + 1);
        const valueMap = attrValueMap[attrName];
        
        if (valueMap && valueMap[valueSlug]) {
          // Found matching value
          if (!attributes[attrName]) {
            attributes[attrName] = [];
          }
          if (!attributes[attrName].includes(valueMap[valueSlug])) {
            attributes[attrName].push(valueMap[valueSlug]);
          }
          matched = true;
          break;
        }
      }
    }
    
    // If not matched as "attr-name-attr-value", try as standalone value
    // Usually the first segment is a color value without attribute name
    if (!matched) {
      // Check all attributes to find which one has this value
      for (const [attrName, valueMap] of Object.entries(attrValueMap)) {
        if (valueMap[segmentLower]) {
          // Found matching value
          if (!attributes[attrName]) {
            attributes[attrName] = [];
          }
          if (!attributes[attrName].includes(valueMap[segmentLower])) {
            attributes[attrName].push(valueMap[segmentLower]);
          }
          matched = true;
          break;
        }
      }
    }
  });
  
  return attributes;
}

/**
 * Parse brand from path segments
 * Format: brand-brandname or just brandname (if brands list is provided)
 * @param {string[]} pathSegments - Array of path segments
 * @param {Array} brands - Optional array of brand objects to match against
 * @param {Array} attributeValues - Optional array of attribute values to exclude from brand matching
 * @returns {string|null} - Brand name or null (returns null if multiple brands found, as they should be handled as attributes)
 */
export function parseBrandFromPathSegments(pathSegments = [], brands = [], attributeValues = []) {
  if (!pathSegments || pathSegments.length === 0) return null;
  
  // Build a set of attribute value slugs to exclude from brand matching
  const attributeValueSlugs = new Set();
  if (attributeValues && attributeValues.length > 0) {
    attributeValues.forEach((attrObj) => {
      if (attrObj.values) {
        attrObj.values.forEach((val) => {
          attributeValueSlugs.add(toSlug(val).toLowerCase());
        });
      }
    });
  }
  
  // Build a map of brand slugs to brand names
  // Support both array of strings and array of objects
  const brandSlugMap = {};
  if (brands && brands.length > 0) {
    brands.forEach((brand) => {
      let brandName = null;
      if (typeof brand === 'string') {
        brandName = brand;
      } else if (brand && brand.brand_name) {
        brandName = brand.brand_name;
      } else if (brand && brand.name) {
        brandName = brand.name;
      }
      if (brandName) {
        const brandSlug = toSlug(brandName).toLowerCase();
        brandSlugMap[brandSlug] = brandName;
      }
    });
  }
  
  // 🔹 Count brand segments with "brand-" prefix
  const brandSegmentsWithPrefix = pathSegments.filter(segment => 
    segment.toLowerCase().startsWith("brand-")
  );
  
  // 🔹 If any brands found with prefix, return null (they should be handled as Brand attribute by parsePathSegments)
  if (brandSegmentsWithPrefix.length > 0) {
    return null;
  }
  
  // 🔹 إذا لم نجد brand مع prefix، نبحث عن brand بدون prefix (single brand only)
  // Count brands without prefix
  const brandsWithoutPrefix = [];
  for (const segment of pathSegments) {
    const segmentLower = segment.toLowerCase();
    // Check if it's a brand segment without prefix (if brands list is provided)
    if (brands && brands.length > 0 && !attributeValueSlugs.has(segmentLower)) {
      if (brandSlugMap[segmentLower]) {
        brandsWithoutPrefix.push(brandSlugMap[segmentLower]);
      }
    }
  }
  
  // 🔹 If multiple brands without prefix found, return null (they should be handled as Brand attribute)
  if (brandsWithoutPrefix.length > 1) {
    return null;
  }
  
  // 🔹 If one brand without prefix found, return it
  if (brandsWithoutPrefix.length === 1) {
    return brandsWithoutPrefix[0];
  }
  
  return null;
}


