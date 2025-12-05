import { NextResponse } from "next/server";

/**
 * SMSA Express API Configuration
 * - Sandbox: https://ecomapis-sandbox.azurewebsites.net
 * - Production: https://ecomapis.smsaexpress.com
 */
const SMSA_API_ENDPOINT = process.env.NODE_ENV === "production" 
  ? "https://ecomapis.smsaexpress.com"
  : "https://ecomapis-sandbox.azurewebsites.net";

const SMSA_API_KEY = process.env.NODE_ENV === "production"
  ? "ce361e7d11104da0a24539994eab2f6c"
  : "e984157a3da448f5bae9dc06d090500a";

/**
 * Create shipping order with SMSA Express API
 * This endpoint receives order data and forwards it to SMSA Express in the required format
 */
export async function POST(request) {
  try {
    // Parse the incoming request body
    const body = await request.json();
    const { input } = body;

    // Validate required fields
    if (!input) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing 'input' field in request body",
        },
        { status: 400 }
      );
    }

    // Validate critical fields
    if (!input.cart_id && !input.order_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: cart_id or order_id",
        },
        { status: 400 }
      );
    }

    if (!input.customer_email || !input.customer_phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: customer_email and customer_phone",
        },
        { status: 400 }
      );
    }

    if (!input.shipping_address || !input.billing_address) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: shipping_address and billing_address",
        },
        { status: 400 }
      );
    }

    // Prepare the payload in the exact format required by SMSA Express API
    const smsaPayload = {
      input: {
        cart_id: input.cart_id || input.order_id?.toString(),
        shipping_cost: input.shipping_cost || 0,
        total_amount: input.total_amount || 0,
        vat_amount: input.vat_amount || 0,
        subtotal: input.subtotal || 0,
        currency: input.currency || "EUR",
        shipping_type: input.shipping_type || "standard",
        shipping_country_id: input.shipping_country_id || "1",
        shipping_address: {
          first_name: input.shipping_address.first_name || "",
          last_name: input.shipping_address.last_name || "",
          address_line_1: input.shipping_address.address_line_1 || "",
          address_line_2: input.shipping_address.address_line_2 || "",
          locality: input.shipping_address.locality || "",
          postal_code: input.shipping_address.postal_code || "",
          country_code: input.shipping_address.country_code || "",
        },
        billing_address: {
          first_name: input.billing_address.first_name || "",
          last_name: input.billing_address.last_name || "",
          address_line_1: input.billing_address.address_line_1 || "",
          address_line_2: input.billing_address.address_line_2 || "",
          locality: input.billing_address.locality || "",
          postal_code: input.billing_address.postal_code || "",
          country_code: input.billing_address.country_code || "",
        },
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        redirect_url: input.redirect_url || "",
        webhook_url: input.webhook_url || "",
        tags: input.tags || ["smsa"],
        tracking_urls: input.tracking_urls || [],
        published: input.published !== undefined ? input.published : true,
      },
    };

    console.log("📦 Creating SMSA Express order:", {
      cart_id: smsaPayload.input.cart_id,
      customer_email: smsaPayload.input.customer_email,
      total_amount: smsaPayload.input.total_amount,
    });

    // Call SMSA Express API
    const smsaResponse = await fetch(`${SMSA_API_ENDPOINT}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": SMSA_API_KEY,
        Authorization: `Bearer ${SMSA_API_KEY}`,
      },
      body: JSON.stringify(smsaPayload),
    });

    // Parse response
    const responseData = await smsaResponse.json().catch(() => ({
      message: "Failed to parse response",
    }));

    // Handle error responses
    if (!smsaResponse.ok) {
      console.error("❌ SMSA API Error:", {
        status: smsaResponse.status,
        statusText: smsaResponse.statusText,
        data: responseData,
      });

      return NextResponse.json(
        {
          success: false,
          error: responseData.message || responseData.error || "SMSA API request failed",
          status: smsaResponse.status,
          details: responseData,
        },
        { status: smsaResponse.status }
      );
    }

    // Success response
    console.log("✅ SMSA Express order created successfully:", responseData);

    return NextResponse.json({
      success: true,
      message: "Order created successfully with SMSA Express",
      data: responseData,
      order_id: responseData.order_id || responseData.id,
      tracking_number: responseData.tracking_number || responseData.trackingNumber,
    });
  } catch (error) {
    // Handle network errors, JSON parsing errors, etc.
    console.error("❌ SMSA Integration Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create SMSA order",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

