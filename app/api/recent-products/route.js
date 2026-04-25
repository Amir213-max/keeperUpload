
import { graphqlClient } from '@/app/lib/graphqlClient';

function buildProductsBySkuBatchQuery(skus) {
  const uniqueSkus = [...new Set((skus || []).filter(Boolean))];
  if (uniqueSkus.length === 0) return null;

  const variableDefs = uniqueSkus.map((_, idx) => `$sku${idx}: ID!`).join(", ");
  const productSelections = uniqueSkus
    .map(
      (_, idx) => `
      p${idx}: product(sku: $sku${idx}) {
        name
        sku
        images {
          url
        }
        brand {
          name
        }
        listPrice {
          amount
          currency
        }
      }`
    )
    .join("\n");

  const query = `query GetProductsBySkuBatch(${variableDefs}) {${productSelections}\n}`;
  const variables = Object.fromEntries(uniqueSkus.map((sku, idx) => [`sku${idx}`, sku]));
  return { query, variables, uniqueSkus };
}

export async function getRecentlySeenProducts(skus) {
  if (!skus?.length) return [];
  const payload = buildProductsBySkuBatchQuery(skus);
  if (!payload) return [];

  try {
    const response = await graphqlClient.request(payload.query, payload.variables);
    const bySku = new Map();
    for (let i = 0; i < payload.uniqueSkus.length; i += 1) {
      const p = response?.[`p${i}`];
      if (p?.sku) bySku.set(String(p.sku), p);
    }
    // Preserve original order from local recently-seen list.
    return skus.map((sku) => bySku.get(String(sku))).filter(Boolean);
  } catch (error) {
    console.error("Error fetching recent products batch:", error);
    return [];
  }
}
