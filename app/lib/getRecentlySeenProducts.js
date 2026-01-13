// import { graphqlClient } from './graphqlClient';
// import { gql } from 'graphql-request';

//  const GET_PRODUCT_BY_SKU = gql`
//   query GetProductBySKU($sku: String!) {
//     productBySku(sku: $sku) {
//       id
//       sku
//       name
//       are_shoes
//       list_price_amount
      
//       brand {
//         id
//         name
//       }
//       productAttributeValues {
//         id
//         key
//         attribute {
//           id
//           label
//         }
//       }
//     }
//   }
// `;

// export async function getRecentlySeenProducts(skus) {
//   if (!skus?.length) return [];

//   const productPromises = skus.map(async (sku) => {
//     const variables = { sku };
//     try {
//       const response = await graphqlClient.request(GET_PRODUCT_BY_SKU, variables);
//       return response.product;
//     } catch (error) {
//       console.error(`Error fetching product with SKU ${sku}:`, error);
//       return null; // skip if error
//     }
//   });

//   const products = await Promise.all(productPromises);
//   return products.filter(Boolean); // remove nulls
// }
