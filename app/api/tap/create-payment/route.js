import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, currency, customerEmail, customerPhone, customerName, orderId } = body;

    const tapResponse = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        customer: {
          first_name: customerName || "Customer",
          email: customerEmail || "example@mail.com",
          phone: {
            country_code: "966", // تقدر تعدل الكود حسب الدولة
            number: customerPhone || "000000000",
          },
        },
        source: {
          id: "src_all", // بيسمح لكل وسائل الدفع
        },
        redirect: {
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?orderId=${orderId}`,
        },
      }),
    });

    // Check if response is OK before parsing
    if (!tapResponse.ok) {
      const errorData = await tapResponse.json().catch(() => ({ message: "Failed to parse error response" }));
      console.error("Tap API Error Response:", errorData);
      return NextResponse.json({ 
        success: false, 
        error: errorData.errors || errorData.message || "Invalid response from Tap payment service",
        details: errorData 
      }, { status: tapResponse.status });
    }

    const data = await tapResponse.json();

    // Check for errors in response
    if (data.errors || !data.transaction) {
      console.error("Tap API Error:", data);
      return NextResponse.json({ 
        success: false, 
        error: data.errors || "Invalid response from Tap payment service",
        details: data 
      }, { status: 400 });
    }

    // Verify transaction URL exists
    if (!data.transaction?.url) {
      console.error("Missing transaction URL in Tap response:", data);
      return NextResponse.json({ 
        success: false, 
        error: "Invalid response from Tap payment service - missing payment URL",
        details: data 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, paymentUrl: data.transaction.url });
  } catch (error) {
    console.error("TAP ERROR:", error);
    return NextResponse.json({ success: false, message: "Error creating payment" }, { status: 500 });
  }
}
