import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const { amount, currency, orderId } = body;

    const response = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        threeDSecure: true,
        save_card: false,
        description: `Order #${orderId}`,
        metadata: { order_id: orderId },
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/redirect`,
        },
        source: { id: "src_all" },
      }),
    });

    // Check if response is OK before parsing
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
      console.error("Tap API Error Response:", errorData);
      return NextResponse.json({ 
        error: "Invalid response from Tap payment service",
        details: errorData.errors || errorData.message || errorData
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Check for errors in response
    if (data.errors) {
      console.error("Tap API Error:", data);
      return NextResponse.json({ 
        error: "Invalid response from Tap payment service",
        details: data.errors 
      }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("TAP ERROR:", error);
    return NextResponse.json({ error: "Failed to create Tap payment" }, { status: 500 });
  }
}
