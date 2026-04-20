import { isSmsaMock, getMockSmsaShippingCost } from "../smsaMock";

/**
 * Optional SMSA live shipping rate proxy.
 *
 * Checkout (`checkout_1`) calls this first, then falls back to GraphQL
 * `calculateShipping` when `cost` is 0 or `success` is false.
 *
 * Mock: set SMSA_MOCK=true in .env.local for local tests (no real SMSA call).
 *
 * Live: set SMSA_RATE_API_URL + SMSA_API_KEY when SMSA provides a JSON rate endpoint.
 */
export async function POST(req) {
  try {
    const { countryCode, type } = await req.json();

    if (isSmsaMock()) {
      const cost = getMockSmsaShippingCost(countryCode, type);
      return Response.json({
        success: true,
        cost,
        mock: true,
        message:
          "SMSA_MOCK: simulated rate. Set SMSA_MOCK=false and configure SMSA when ready.",
      });
    }

    const key = process.env.SMSA_API_KEY;
    const rateUrl = process.env.SMSA_RATE_API_URL?.trim();

    if (!key || !rateUrl) {
      return Response.json({
        success: false,
        cost: 0,
        message:
          "SMSA live rates not configured (set SMSA_RATE_API_URL + SMSA_API_KEY, or rely on store calculateShipping).",
      });
    }

    const response = await fetch(rateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
      },
      body: JSON.stringify({
        country_code: countryCode,
        service_type: type === "fast" ? "express" : "standard",
      }),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({
        success: false,
        cost: 0,
        message: "SMSA rate response was not valid JSON",
      });
    }

    const cost = Number(
      data?.Rate ?? data?.rate ?? data?.cost ?? data?.amount ?? data?.Amount ?? 0
    );
    const numericCost = Number.isFinite(cost) && cost > 0 ? cost : 0;

    return Response.json({
      success: response.ok && numericCost > 0,
      cost: numericCost,
      ...(process.env.NODE_ENV === "development" ? { debug: { status: response.status } } : {}),
    });
  } catch (error) {
    console.error("SMSA shipping route:", error);
    return Response.json({
      success: false,
      cost: 0,
      error: error?.message || "SMSA rate request failed",
    });
  }
}
