import { NextResponse } from "next/server";

// SMSA Express API Configuration
const SMSA_API_ENDPOINT = process.env.NODE_ENV === "production"
  ? "https://ecomapis.smsaexpress.com"
  : "https://ecomapis-sandbox.azurewebsites.net";

// SMSA API Key - use the exact key provided (case-sensitive)
// Note: Must restart Next.js server after adding/changing .env.local
const SMSA_API_KEY = process.env.SMSA_API_KEY || "e984157a3da448f5bae9dc06d090500a";

// Log API key source for debugging (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("🔑 SMSA API Key Configuration:", {
    fromEnv: !!process.env.SMSA_API_KEY,
    keyLength: SMSA_API_KEY?.length,
    keyPreview: SMSA_API_KEY ? SMSA_API_KEY.substring(0, 8) + "..." : "missing",
    keyFull: SMSA_API_KEY, // Log full key for debugging
  });
}

/**
 * Create B2C shipment with SMSA Express
 * API Endpoint: POST /api/shipment/b2c/new
 * Only for orders with country code SA
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
      totalAmount,
      codAmount = 0, // Cash on Delivery amount (default 0)
    } = body;

    // Validate required fields
    if (!orderId || !customerName || !customerPhone || !shippingAddress) {
      console.error("❌ Missing required fields:", {
        hasOrderId: !!orderId,
        hasCustomerName: !!customerName,
        hasCustomerPhone: !!customerPhone,
        hasShippingAddress: !!shippingAddress,
        customerPhone: customerPhone,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: orderId, customerName, customerPhone, shippingAddress",
          missingFields: {
            orderId: !orderId,
            customerName: !customerName,
            customerPhone: !customerPhone,
            shippingAddress: !shippingAddress,
          },
        },
        { status: 400 }
      );
    }

    // Clean and validate phone number
    const cleanedPhone = customerPhone.replace(/[^0-9+]/g, "").trim();
    if (!cleanedPhone || cleanedPhone.length < 9) {
      console.error("❌ Invalid phone number:", {
        original: customerPhone,
        cleaned: cleanedPhone,
        length: cleanedPhone.length,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer phone number. Phone must be at least 9 digits",
          phone: customerPhone,
          cleanedPhone: cleanedPhone,
        },
        { status: 400 }
      );
    }

    // Validate country code is SA
    const countryCode = shippingAddress.country_code || "SA";
    if (countryCode !== "SA") {
      return NextResponse.json(
        {
          success: false,
          error: "SMSA shipping is only available for Saudi Arabia (SA)",
          countryCode: countryCode,
        },
        { status: 400 }
      );
    }

    // Prepare content description from items
    const contentDescription = items && items.length > 0
      ? items.map(item => `${item.product_name || "Product"} (Qty: ${item.quantity || 1})`).join(", ")
      : "Shipment Description and content";

    // Calculate total weight and parcels from items
    // Default weight per item: 0.5 KG (can be adjusted based on actual product weights)
    const defaultWeightPerItem = 0.5;
    const totalParcels = items && items.length > 0 
      ? items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 1;
    const totalWeight = items && items.length > 0
      ? items.reduce((sum, item) => sum + ((item.quantity || 1) * defaultWeightPerItem), 0)
      : defaultWeightPerItem;
    
    // Ensure minimum weight
    const weight = Math.max(totalWeight, 0.001);

    // Get today's date in YYYY-MM-DD format
    const shipDate = new Date().toISOString().split('T')[0];

    // Prepare SMSA B2C shipment payload according to API documentation
    const smsaPayload = {
      OrderNumber: orderNumber || orderId.toString(), // Order Number is required
      CODAmount: codAmount || 0, // In destination currency
      Weight: weight, // Weight (min 0.001)
      WeightUnit: "KG", // Weight measuring unit (KG or LB)
      Parcels: totalParcels, // Number of parcels
      ShipDate: shipDate, // Shipment shipping date (YYYY-MM-DD)
      ShipmentCurrency: "SAR", // Shipment Currency (default SAR for Saudi Arabia)
      ContentDescription: contentDescription,
      DeclaredValue: totalAmount || 0, // Declared value of shipment
      ReferenceNumber: orderNumber || orderId.toString(), // Your order reference
      ShipperAddress: {
        // Default shipper address - should be configured from environment or settings
        ContactName: process.env.SMSA_SHIPPER_NAME || "Soccer One Sports",
        ContactPhoneNumber: (process.env.SMSA_SHIPPER_PHONE || "+966500000000").replace(/[^0-9+]/g, ""), // Contact Phone Number is required
        AddressLine1: process.env.SMSA_SHIPPER_ADDRESS_LINE1 || "Riyadh",
        AddressLine2: process.env.SMSA_SHIPPER_ADDRESS_LINE2 || "",
        City: process.env.SMSA_SHIPPER_CITY || "Riyadh",
        PostalCode: process.env.SMSA_SHIPPER_POSTAL_CODE || "12345",
        Country: "SA", // Shipper country (Saudi Arabia)
      },
      ConsigneeAddress: {
        ContactName: customerName.trim(), // Contact Name is required
        ContactPhoneNumber: cleanedPhone, // Contact Phone Number is required (use cleaned phone)
        ConsigneeName: customerName.trim(),
        ConsigneeMobile: cleanedPhone, // Keep for compatibility
        ConsigneePhone: cleanedPhone, // Keep for compatibility
        ConsigneeEmail: customerEmail || "",
        AddressLine1: shippingAddress.address_line_1 || shippingAddress.address || "",
        AddressLine2: shippingAddress.address_line_2 || "",
        City: shippingAddress.locality || shippingAddress.city || "",
        PostalCode: shippingAddress.postal_code || shippingAddress.zip || "",
        Country: countryCode, // Country ISO Code is required (not CountryCode)
      },
    };

    // Validate critical fields
    if (!smsaPayload.ConsigneeAddress.AddressLine1 || !smsaPayload.ConsigneeAddress.City) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required shipping address fields: address and city are required",
          missingFields: {
            address: !smsaPayload.ConsigneeAddress.AddressLine1,
            city: !smsaPayload.ConsigneeAddress.City,
          },
        },
        { status: 400 }
      );
    }

    // Validate phone numbers are present and valid
    if (!smsaPayload.ShipperAddress.ContactPhoneNumber || smsaPayload.ShipperAddress.ContactPhoneNumber.length < 9) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid shipper phone number. Phone must be at least 9 digits",
          phone: smsaPayload.ShipperAddress.ContactPhoneNumber,
        },
        { status: 400 }
      );
    }

    if (!smsaPayload.ConsigneeAddress.ContactPhoneNumber || smsaPayload.ConsigneeAddress.ContactPhoneNumber.length < 9) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid customer phone number. Phone must be at least 9 digits",
          phone: smsaPayload.ConsigneeAddress.ContactPhoneNumber,
          originalPhone: customerPhone,
        },
        { status: 400 }
      );
    }

    console.log("📦 SMSA API Request:", {
      endpoint: `${SMSA_API_ENDPOINT}/api/shipment/b2c/new`,
      hasApiKey: !!SMSA_API_KEY,
      payload: {
        ...smsaPayload,
        ConsigneeAddress: {
          ...smsaPayload.ConsigneeAddress,
          ConsigneeMobile: smsaPayload.ConsigneeAddress.ConsigneeMobile.substring(0, 3) + "***", // Mask phone for security
        },
      },
    });

    // Call SMSA Express API
    let smsaResponse;
    try {
      // SMSA API requires 'apikey' header (lowercase) as per documentation
      const headers = {
        "Content-Type": "application/json",
        "apikey": SMSA_API_KEY, // Must be 'apikey' (lowercase) as per SMSA docs
      };

      console.log("🔑 SMSA API Key Info:", {
        hasKey: !!SMSA_API_KEY,
        keyLength: SMSA_API_KEY?.length,
        keyFull: SMSA_API_KEY, // Log full key for debugging
        endpoint: `${SMSA_API_ENDPOINT}/api/shipment/b2c/new`,
        headerName: "apikey",
        headersSent: Object.keys(headers),
        headerValue: headers.apikey, // Log the actual header value being sent
        nodeEnv: process.env.NODE_ENV,
      });

      console.log("📤 SMSA Request Details:", {
        url: `${SMSA_API_ENDPOINT}/api/shipment/b2c/new`,
        method: "POST",
        headers: {
          "Content-Type": headers["Content-Type"],
          "apikey": headers.apikey ? headers.apikey.substring(0, 8) + "..." : "missing",
        },
        payloadKeys: Object.keys(smsaPayload),
      });

      smsaResponse = await fetch(`${SMSA_API_ENDPOINT}/api/shipment/b2c/new`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(smsaPayload),
      });

      console.log("📥 SMSA Response Status:", {
        status: smsaResponse.status,
        statusText: smsaResponse.statusText,
        ok: smsaResponse.ok,
        headers: Object.fromEntries(smsaResponse.headers.entries()),
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

    // Get response text first
    const responseText = await smsaResponse.text();
    let errorData = null;
    let smsaData = null;

    // Check if response is HTML (error page)
    if (responseText.includes("<!DOCTYPE") || responseText.includes("<html") || responseText.trim().startsWith("<")) {
      console.error("❌ SMSA API returned HTML instead of JSON:", {
        status: smsaResponse.status,
        statusText: smsaResponse.statusText,
        contentType: smsaResponse.headers.get("content-type"),
        responsePreview: responseText.substring(0, 500),
        endpoint: `${SMSA_API_ENDPOINT}/api/shipment/b2c/new`,
      });

      return NextResponse.json(
        {
          success: false,
          error: `SMSA API returned HTML instead of JSON (Status: ${smsaResponse.status}). The API endpoint may be incorrect.`,
          status: smsaResponse.status,
          details: {
            endpoint: `${SMSA_API_ENDPOINT}/api/shipment/b2c/new`,
            responseType: "HTML",
            responsePreview: responseText.substring(0, 300),
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
        responseText: responseText.substring(0, 1000),
        endpoint: `${SMSA_API_ENDPOINT}/api/shipment/b2c/new`,
      });

      // Try to extract more error details
      let errorMessage = "SMSA API request failed";
      if (errorData) {
        errorMessage = errorData?.message || errorData?.error || errorData?.errorMessage || errorData?.Message || JSON.stringify(errorData);
      } else if (responseText) {
        errorMessage = responseText.substring(0, 200);
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          status: smsaResponse.status,
          details: {
            ...errorData,
            rawResponse: responseText.substring(0, 500),
            statusText: smsaResponse.statusText,
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

    // Extract tracking number and AWB from response
    // Handle different possible response structures
    const trackingNumber = smsaData.AWB || smsaData.awb || smsaData.trackingNumber || smsaData.tracking_number || smsaData.TrackingNumber;
    const shipmentId = smsaData.ShipmentId || smsaData.shipmentId || smsaData.id || smsaData.ID || orderId;

    return NextResponse.json({
      success: true,
      shipmentId: shipmentId,
      trackingNumber: trackingNumber,
      awb: trackingNumber, // AWB is the tracking number
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
    smsaEndpoint: `${process.env.NODE_ENV === "production" ? "https://ecomapis.smsaexpress.com" : "https://ecomapis-sandbox.azurewebsites.net"}/api/shipment/b2c/new`,
    timestamp: new Date().toISOString(),
  });
}
