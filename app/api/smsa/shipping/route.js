export async function POST(req) {
  try {
    const { countryCode, type } = await req.json();

    // 🟢 إعدادات SMSA (ضع مفاتيحك هنا)
    const SMSA_API_URL = "https://track.smsaexpress.com/SeComService/AvailableServices"; // مثال
    const SMSA_API_KEY = process.env.SMSA_API_KEY;

    // 🔹 نرسل طلب تجريبي لـ SMSA API
    const response = await fetch(SMSA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SMSA_API_KEY}`,
      },
      body: JSON.stringify({
        country_code: countryCode,
        service_type: type === "fast" ? "express" : "standard",
      }),
    });

    const data = await response.json();

    // 🧩 استخرج التكلفة
    const cost = data?.Rate || data?.cost || 0;

    return Response.json({ success: true, cost });
  } catch (error) {
    console.error("SMSA API Error:", error);
    return Response.json({ success: false, error: error.message });
  }
}
