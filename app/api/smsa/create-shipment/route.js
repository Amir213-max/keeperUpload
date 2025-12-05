import { NextResponse } from "next/server";

// SMSA Express API Configuration
const SMSA_API_ENDPOINT = process.env.SMSA_API_ENDPOINT || "https://ecomapis-sandbox.azurewebsites.net";
const SMSA_API_KEY = process.env.SMSA_API_KEY || "e984157a3da448f5bae9dc06d090500a";

/**
 * Create shipment with SMSA Express
 * Only for orders with country code SA and shipping type "normal"
 * 
 * Route: POST /api/smsa/create-shipment
 */
export async function POST(request) {
  console.log("📦 SMSA create-shipment route POST called at:", new Date().toISOString());
  try {
    const body = await request.json();
    const {
      orderId,
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      items,
    } = body;

    // Validate required fields
    if (!orderId || !customerName || !customerPhone || !shippingAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: orderId, customerName, customerPhone, shippingAddress",
        },
        { status: 400 }
      );
    }

    // Prepare SMSA Express shipment data
    const shipmentData = {
      orderId: orderNumber || orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.replace(/[^0-9]/g, ""), // Remove non-numeric characters
      customerEmail: customerEmail || "",
      address: shippingAddress.address_line_1 || shippingAddress.address,
      city: shippingAddress.locality || shippingAddress.city || "",
      postalCode: shippingAddress.postal_code || shippingAddress.zip || "",
      countryCode: shippingAddress.country_code || "SA",
      items: items || [],
    };

    console.log("📦 Creating SMSA shipment:", {
      orderId: shipmentData.orderId,
      customerName: shipmentData.customerName,
      customerPhone: shipmentData.customerPhone,
    });

    // Prepare request payload in SMSA API format (same as create-order)
    // Split customer name into first and last name
    const nameParts = shipmentData.customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const smsaPayload = {
      input: {
        cart_id: shipmentData.orderId.toString(),
        shipping_cost: 0, // Will be set by SMSA or from order data
        total_amount: 0, // Should be passed from order
        vat_amount: 0,
        subtotal: 0,
        currency: "SAR",
        shipping_type: "standard",
        shipping_country_id: shipmentData.countryCode === "SA" ? "1" : shipmentData.countryCode,
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address_line_1: shipmentData.address,
          address_line_2: "",
          locality: shipmentData.city,
          postal_code: shipmentData.postalCode || "",
          country_code: shipmentData.countryCode,
        },
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          address_line_1: shipmentData.address,
          address_line_2: "",
          locality: shipmentData.city,
          postal_code: shipmentData.postalCode || "",
          country_code: shipmentData.countryCode,
        },
        customer_email: shipmentData.customerEmail,
        customer_phone: shipmentData.customerPhone,
        redirect_url: "",
        webhook_url: "",
        tags: ["smsa"],
        tracking_urls: [],
        published: true,
      },
    };

    // Validate critical fields before sending
    if (!smsaPayload.input.shipping_address.address_line_1 || !smsaPayload.input.shipping_address.locality) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required shipping address fields: address and city are required",
          missingFields: {
            address: !smsaPayload.input.shipping_address.address_line_1,
            city: !smsaPayload.input.shipping_address.locality,
          },
        },
        { status: 400 }
      );
    }

    if (!smsaPayload.input.customer_phone || smsaPayload.input.customer_phone.length < 9) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer phone number. Phone must be at least 9 digits",
          phone: smsaPayload.input.customer_phone,
        },
        { status: 400 }
      );
    }

    console.log("📦 SMSA API Request:", {
      endpoint: `${SMSA_API_ENDPOINT}/api/orders`,
      hasApiKey: !!SMSA_API_KEY,
      payload: {
        ...smsaPayload,
        input: {
          ...smsaPayload.input,
          customer_phone: smsaPayload.input.customer_phone.substring(0, 3) + "***", // Mask phone for security
        },
      },
    });

    // Call SMSA Express API - Note: SMSA uses /api/orders, not /api/shipments
    let smsaResponse;
    try {
      smsaResponse = await fetch(`${SMSA_API_ENDPOINT}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": SMSA_API_KEY,
          Authorization: `Bearer ${SMSA_API_KEY}`,
        },
        body: JSON.stringify(smsaPayload),
      });
    } catch (fetchError) {
      console.error("❌ SMSA API Network Error:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: `Network error: ${fetchError.message}`,
          details: "Failed to connect to SMSA API. Please check the endpoint URL and network connection.",
        },
        { status: 500 }
      );
    }

    // Get response text first to check content type
    const responseText = await smsaResponse.text();
    let errorData = null;
    let smsaData = null;

    // Check if response is HTML (common for error pages or wrong endpoint)
    if (responseText.includes("<!DOCTYPE") || responseText.includes("<html") || responseText.trim().startsWith("<")) {
      console.error("❌ SMSA API returned HTML instead of JSON:", {
        status: smsaResponse.status,
        statusText: smsaResponse.statusText,
        contentType: smsaResponse.headers.get("content-type"),
        responsePreview: responseText.substring(0, 500),
        endpoint: `${SMSA_API_ENDPOINT}/api/shipments`,
      });

      return NextResponse.json(
        {
          success: false,
          error: `SMSA API returned HTML instead of JSON (Status: ${smsaResponse.status}). The API endpoint may be incorrect, the service is unavailable, or the endpoint path is wrong.`,
          status: smsaResponse.status,
          details: {
            endpoint: `${SMSA_API_ENDPOINT}/api/orders`,
            responseType: "HTML",
            responsePreview: responseText.substring(0, 300),
            suggestion: "Please verify the SMSA API endpoint URL and API key. The endpoint should be /api/orders.",
          },
        },
        { status: smsaResponse.status || 500 }
      );
    }

    // Try to parse as JSON
    try {
      if (responseText) {
        if (smsaResponse.ok) {
          smsaData = JSON.parse(responseText);
        } else {
          errorData = JSON.parse(responseText);
        }
      }
    } catch (parseError) {
      // Response is not JSON and not HTML - could be plain text error
      console.error("❌ SMSA API Response Parse Error:", {
        status: smsaResponse.status,
        statusText: smsaResponse.statusText,
        contentType: smsaResponse.headers.get("content-type"),
        responsePreview: responseText.substring(0, 500),
        parseError: parseError.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: responseText || "SMSA API request failed",
          status: smsaResponse.status,
          details: {
            rawResponse: responseText.substring(0, 500),
            statusText: smsaResponse.statusText,
            contentType: smsaResponse.headers.get("content-type"),
            parseError: parseError.message,
          },
        },
        { status: smsaResponse.status || 500 }
      );
    }

    // Check if response is OK
    if (!smsaResponse.ok) {
      console.error("❌ SMSA API Error Response:", {
        status: smsaResponse.status,
        statusText: smsaResponse.statusText,
        error: errorData,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorData?.message || errorData?.error || errorData?.errorMessage || "SMSA API request failed",
          status: smsaResponse.status,
          details: errorData,
          requestPayload: {
            orderId: smsaPayload.input.cart_id,
            customerName: `${smsaPayload.input.shipping_address.first_name} ${smsaPayload.input.shipping_address.last_name}`,
            city: smsaPayload.input.shipping_address.locality,
            countryCode: smsaPayload.input.shipping_address.country_code,
          },
        },
        { status: smsaResponse.status }
      );
    }

    // smsaData is already parsed above
    if (!smsaData) {
      return NextResponse.json(
        {
          success: false,
          error: "SMSA API returned empty response",
        },
        { status: 500 }
      );
    }

    console.log("✅ SMSA shipment created successfully:", smsaData);

    return NextResponse.json({
      success: true,
      shipmentId: smsaData.shipmentId || smsaData.id,
      trackingNumber: smsaData.trackingNumber || smsaData.tracking_number,
      message: "Shipment created successfully with SMSA Express",
      data: smsaData,
    });
  } catch (error) {
    console.error("❌ SMSA Integration Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create SMSA shipment",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Add GET method for testing
export async function GET(request) {
  console.log("📦 SMSA create-shipment route GET called at:", new Date().toISOString());
  return NextResponse.json({
    message: "SMSA create-shipment route is working",
    endpoint: "/api/smsa/create-shipment",
    method: "POST",
    timestamp: new Date().toISOString(),
  });
}
