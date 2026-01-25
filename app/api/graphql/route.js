import { NextResponse } from "next/server";
import { GraphQLClient } from "graphql-request";

/**
 * GraphQL API Proxy Route
 * 
 * Why this proxy is required:
 * - CORS: The GraphQL endpoint (https://keepersport.store/graphql) doesn't allow
 *   direct browser requests due to CORS restrictions
 * - Security: Keeps the GraphQL endpoint URL and any sensitive headers server-side
 * - Performance: Server-to-server requests are faster and more reliable
 * 
 * This route acts as a proxy between client components and the GraphQL API,
 * allowing client components to make requests without CORS issues.
 */

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || "https://keepersport.store/graphql";

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, variables, headers = {} } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Create GraphQL client for this request
    const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    // Execute the GraphQL request
    const data = await client.request(query, variables || {});

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GraphQL Proxy Error:", error);
    
    // Handle GraphQL errors properly
    const statusCode = error.response?.status || error.statusCode || 500;
    const errorMessage = error.message || "GraphQL request failed";
    
    // Extract GraphQL errors if available
    const graphqlErrors = error.response?.errors || error.errors;
    
    return NextResponse.json(
      {
        error: errorMessage,
        errors: graphqlErrors,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: statusCode }
    );
  }
}

// Support GET for simple queries (optional)
export async function GET(request) {
  return NextResponse.json(
    { error: "Use POST method for GraphQL requests" },
    { status: 405 }
  );
}

