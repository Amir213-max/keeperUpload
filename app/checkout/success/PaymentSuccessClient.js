"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PaymentSuccessClient() {
  const params = useSearchParams();
  const orderId = params.get("order_id"); // أو "orderId" حسب رابط الدفع عندك

  useEffect(() => {
    if (orderId) {
      console.log("✅ Payment succeeded for order:", orderId);
    } else {
      console.log("⚠️ No order ID found in URL");
    }
  }, [orderId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      {orderId ? (
        <>
          <h1 className="text-3xl font-bold text-green-600">
            Payment Successful ✅
          </h1>
          <p className="mt-4 text-gray-600">Order ID: {orderId}</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-red-600">Error ❌</h1>
          <p className="mt-4 text-gray-600">
            Missing or invalid payment reference.
          </p>
        </>
      )}
    </div>
  );
}
