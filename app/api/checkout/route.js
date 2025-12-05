// import { NextResponse } from "next/server";

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const {
//       amount,
//       currency,
//       customerEmail,
//       customerPhone,
//       customerName,
//       orderId,
//     } = body;

//     const response = await fetch("https://api.tap.company/v2/charges", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         amount,
//         currency,
//         threeDSecure: true,
//         save_card: false,
//         description: `Order #${orderId}`,
//         statement_descriptor: "Keeper Store",
//         customer: {
//           first_name: customerName || "Guest",
//           email: customerEmail,
//           phone: {
//             country_code: "966", 
//             number: customerPhone,
//           },
//         },
//         source: {
//           id: "src_all", // يتيح كل طرق الدفع
//         },
//         redirect: {
//           url: "https://yourdomain.com/payment/callback", // غيّرها لصفحتك الفعلية
//         },
//       }),
//     });

//     const data = await response.json();

//     if (data?.transaction?.url) {
//       return NextResponse.json({ paymentUrl: data.transaction.url });
//     }

//     return NextResponse.json(
//       { error: "Failed to create payment", details: data },
//       { status: 400 }
//     );
//   } catch (err) {
//     console.error("Payment Error:", err);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }
