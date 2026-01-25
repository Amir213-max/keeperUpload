/**
 * Remove Duplicate Products Helper
 * 
 * This function removes duplicate products from an array based on product.id
 * to prevent duplicate keys in React and improve performance.
 * 
 * Why this is needed:
 * - When fetching products from rootCategory and subCategories,
 *   the same product may appear in both, causing duplicates
 * - Duplicate products cause React key warnings and performance issues
 * - This ensures each product appears only once in the list
 */

/**
 * Remove duplicate products from array based on product.id
 * @param {Array} products - Array of products
 * @returns {Array} - Array of unique products (first occurrence kept)
 */
export function removeDuplicateProducts(products) {
  if (!products || !Array.isArray(products)) return [];
  
  // Use Map to track unique products by id (or sku as fallback)
  const uniqueProductsMap = new Map();
  
  products.forEach((product) => {
    // Use product.id as primary unique identifier, fallback to sku if id doesn't exist
    const uniqueKey = product.id || product.sku;
    
    if (uniqueKey) {
      // Only add if we haven't seen this product before
      // Keep the first occurrence (you can modify to keep last if needed)
      if (!uniqueProductsMap.has(uniqueKey)) {
        uniqueProductsMap.set(uniqueKey, product);
      }
    }
  });
  
  // Convert Map back to array
  return Array.from(uniqueProductsMap.values());
}

