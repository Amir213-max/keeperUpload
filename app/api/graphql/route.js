import { NextResponse } from "next/server";

/**
 * GraphQL API Proxy Route
 *
 * Why this proxy is required:
 * - CORS: The GraphQL endpoint doesn't allow direct browser requests
 * - Security: Keeps the GraphQL endpoint URL server-side
 *
 * Note: We use `fetch` instead of `graphql-request` so we can merge a small
 * compatibility payload for Laravel mutations that validate `$request` keys
 * at the JSON root (e.g. changePassword) while the GraphQL variables live
 * under `variables.input`.
 */

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || "https://keepersport.store/graphql";

function buildUpstreamPayload(query, variables) {
  const vars = variables && typeof variables === "object" ? variables : {};
  const payload = { query, variables: vars };

  const input = vars.input;
  if (
    input &&
    typeof input === "object" &&
    Object.prototype.hasOwnProperty.call(input, "current_password") &&
    Object.prototype.hasOwnProperty.call(input, "password") &&
    Object.prototype.hasOwnProperty.call(input, "password_confirmation")
  ) {
    payload.current_password = input.current_password;
    payload.password = input.password;
    payload.password_confirmation = input.password_confirmation;
  }

  return payload;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, variables, headers = {} } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const upstreamBody = buildUpstreamPayload(query, variables);
    const hasAuth = Boolean(headers.Authorization || headers.authorization);

    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      cache: hasAuth ? "no-store" : "force-cache",
      next: hasAuth ? undefined : { revalidate: 60 },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      body: JSON.stringify(upstreamBody),
    });

    const json = await res.json().catch(() => ({}));

    if (Array.isArray(json.errors) && json.errors.length > 0) {
      const msg = json.errors.map((e) => e.message).filter(Boolean).join("; ");
      const status = res.status >= 400 ? res.status : 422;
      return NextResponse.json(
        {
          error: msg,
          errors: json.errors,
        },
        { status }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: json.message || json.error || `GraphQL request failed: ${res.statusText}`,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ data: json.data });
  } catch (error) {
    console.error("GraphQL Proxy Error:", error);

    const statusCode = error.response?.status || error.statusCode || 500;
    const errorMessage = error.message || "GraphQL request failed";
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

export async function GET() {
  return NextResponse.json(
    { error: "Use POST method for GraphQL" },
    { status: 405 }
  );
}
