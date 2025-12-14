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

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data;
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

