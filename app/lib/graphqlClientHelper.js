/**
 * GraphQL Client Helper for Client Components
 * 
 * This helper is used by CLIENT COMPONENTS ONLY to make GraphQL requests
 * through the Next.js API route proxy, avoiding CORS issues.
 * 
 * Server Components should use graphqlClient directly from graphqlClient.js
 */

import { print } from "graphql";

/**
 * Execute a GraphQL query/mutation through the API proxy
 * @param {string|DocumentNode} query - GraphQL query string or DocumentNode (from gql tag)
 * @param {object} variables - Query variables
 * @param {object} headers - Additional headers (e.g., Authorization)
 * @returns {Promise<any>} GraphQL response data
 */
export async function graphqlRequest(query, variables = {}, headers = {}) {
  try {
    // Convert DocumentNode to string if needed
    // graphql-request uses gql tag which returns DocumentNode, not string
    // We need to convert it to string using print() from graphql package
    const queryString = typeof query === "string" ? query : print(query);
    
    // Add Authorization header if token exists
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: queryString, // Use converted string instead of DocumentNode
        variables,
        headers,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `GraphQL request failed: ${response.statusText}`
      );
    }

    const result = await response.json();

    // Handle GraphQL errors - GraphQL can return partial data even with errors
    if (result.errors && result.errors.length > 0) {
      // Check if the error is about null variant names
      const isVariantNameError = result.errors.some(
        (err) => err.path && err.path.includes("variants") && err.path.includes("name")
      );

      // If we have partial data despite errors, try to clean it up
      if (result.data && isVariantNameError) {
        // Log the error but try to return partial data
        console.warn("GraphQL returned partial data with variant name errors:", result.errors);
        
        // Filter out problematic variants with null names
        if (result.data.product) {
          if (result.data.product.variants) {
            result.data.product.variants = result.data.product.variants.filter(
              (variant) => variant !== null && variant !== undefined && variant.name !== null && variant.name !== undefined
            );
          }
          // If product exists but has no valid variants, still return the product
          return result.data;
        }
      }
      
      // If we have data despite errors (non-variant errors), return it
      if (result.data) {
        console.warn("GraphQL returned partial data with errors:", result.errors);
        return result.data;
      }
      
      // No data available, throw error with details
      const errorMessages = result.errors.map((err) => err.message || err.debugMessage || "Unknown error").join("; ");
      throw new Error(`GraphQL Error: ${errorMessages}`);
    }

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data || null;
  } catch (error) {
    console.error("GraphQL Request Error:", error);
    throw error;
  }
}

/**
 * Legacy compatibility: Create a client-like object for easy migration
 */
export const clientGraphQLClient = {
  request: graphqlRequest,
};

