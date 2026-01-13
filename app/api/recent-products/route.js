
import { gql } from 'graphql-request';
import { graphqlClient } from '@/app/lib/graphqlClient';

const PRODUCT_BY_SKU_QUERY = gql`
  query GetProductBySKU($sku: ID!) {
    product(sku: $sku) {
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
    }
  }
`;

export async function getRecentlySeenProducts(skus) {
  if (!skus?.length) return [];

  const productPromises = skus.map(async (sku) => {
    const variables = { sku };
    try {
      const response = await graphqlClient.request(PRODUCT_BY_SKU_QUERY, variables);
      return response.product;
    } catch (error) {
      console.error(`Error fetching product with SKU ${sku}:`, error);
      return null; // skip if error
    }
  });

  const products = await Promise.all(productPromises);
  return products.filter(Boolean); // remove nulls
}
