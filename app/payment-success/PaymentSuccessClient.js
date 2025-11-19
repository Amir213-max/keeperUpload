"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { graphqlClient } from "@/app/lib/graphqlClient";
import { gql } from "graphql-request";
import { CheckCircle, XCircle, Loader2, ShoppingBag, Home, Package } from "lucide-react";

const VERIFY_PAYMENT = gql`
 mutation VerifyPayment($input: VerifyTapPaymentInput!) {
  verifyTapPayment(input: $input) {
      success
      message
      payment_status
      order {
        id
        number
        total_amount
        shipping_type
        shipping_country {
          id
          code
          name
        }
        user {
          id
          name
          email
          phone
        }
        items {
          id
          product_name
          product_sku
          quantity
        }
      }
    }
  }
`;

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");

  const [status, setStatus] = useState("verifying");
  const [orderData, setOrderData] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (orderId) verifyPayment();
  }, [orderId]);

  const verifyPayment = async () => {
    try {
      // Real API call
      const res = await graphqlClient.request(VERIFY_PAYMENT, {
        input: { order_id: orderId },
      });

      console.log("Payment verification:", res);
      const result = res?.verifyTapPayment;

      if (result?.success) {
        setStatus("success");
        setOrderData(result.order);
        setMessage(result.message || "Your payment was successful!");
        
        // ✅ Integrate with SMSA Express if conditions are met
        handleSMSAIntegration(result.order);
      } else {
        setStatus("failed");
        setMessage(result?.message || "Payment verification failed.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setStatus("failed");
      setMessage("An error occurred while verifying your payment.");
    }
  };

  const handleBackToShop = () => {
    router.push("/");
  };

  const handleViewOrders = () => {
    router.push("/myprofile?tab=orders");
  };

  // ✅ Handle SMSA Express Integration
  const handleSMSAIntegration = async (order) => {
    try {
      // Check if order qualifies for SMSA Express
      const countryCode = order?.shipping_country?.code || order?.shipping_country?.id;
      const shippingType = order?.shipping_type?.toLowerCase();

      // Only process if: country is SA and shipping type is "normal"
      if (countryCode !== "SA" && countryCode !== 1) {
        console.log("⏭️ Skipping SMSA: Country is not SA", { countryCode });
        return;
      }

      if (shippingType !== "normal" && shippingType !== "standard") {
        console.log("⏭️ Skipping SMSA: Shipping type is not normal", { shippingType });
        return;
      }

      console.log("📦 Processing SMSA Express integration for order:", order.id);

      // ✅ جلب بيانات customer من localStorage بدلاً من order
      const savedCustomerData = localStorage.getItem("smsa_customer_data");
      let customerData = null;
      
      if (savedCustomerData) {
        try {
          customerData = JSON.parse(savedCustomerData);
          console.log("✅ Using customer data from localStorage:", customerData);
        } catch (e) {
          console.error("❌ Failed to parse customer data from localStorage:", e);
        }
      }

      // ✅ استخدام البيانات من localStorage أو fallback إلى order
      const shipmentData = {
        orderId: order.id,
        orderNumber: order.number,
        customerName: customerData 
          ? `${customerData.first_name} ${customerData.last_name}`.trim()
          : order.user?.name || "Customer",
        customerPhone: customerData?.phone || order.user?.phone || "",
        customerEmail: customerData?.email || order.user?.email || "",
        shippingAddress: {
          address_line_1: customerData?.address || order.shipping_address?.address_line_1 || "",
          locality: customerData?.city || order.shipping_address?.locality || "",
          postal_code: customerData?.zip || order.shipping_address?.postal_code || "",
          country_code: customerData?.country_code || order.shipping_country?.code || "SA",
        },
        items: order.items || [],
      };

      // Validate that we have required address data
      if (!shipmentData.shippingAddress.address_line_1) {
        console.warn("⚠️ Shipping address not available. Using data from localStorage or order.");
      }

      // Call SMSA Express API
      const response = await fetch("/api/smsa/create-shipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(shipmentData),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ SMSA shipment created:", result);
        // ✅ حذف البيانات من localStorage بعد الاستخدام الناجح
        localStorage.removeItem("smsa_customer_data");
        console.log("🗑️ Removed customer data from localStorage after successful SMSA integration");
      } else {
        console.error("❌ SMSA shipment failed:", result.error);
        // Don't show error to user - payment was successful, shipping can be handled later
      }
    } catch (error) {
      console.error("❌ SMSA integration error:", error);
      // Silent fail - don't interrupt payment success flow
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-yellow-50 to-gray-100 px-4 py-8">
      <div className="w-full max-w-2xl">
        {status === "verifying" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center animate-fadeIn">
            <div className="flex flex-col items-center">
              <Loader2 className="w-20 h-20 text-yellow-400 animate-spin mb-6" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Verifying Payment...
              </h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Please wait a moment while we confirm your payment. This may take a few seconds.
              </p>
              <div className="mt-8 w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-yellow-400 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
              </div>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center animate-fadeIn">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                <CheckCircle className="w-24 h-24 text-green-500 relative z-10" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-green-600 mb-4">
                Payment Successful!
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">{message}</p>

              {orderData && (
                <div className="w-full bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 md:p-8 mb-8 border-2 border-yellow-200">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Package className="w-6 h-6 text-yellow-600" />
                    <h2 className="text-2xl font-bold text-gray-800">Order Details</h2>
                  </div>
                  <div className="space-y-4 text-left max-w-md mx-auto">
                    <div className="flex justify-between items-center py-3 border-b border-yellow-200">
                      <span className="text-gray-600 font-medium">Order ID:</span>
                      <span className="font-bold text-gray-800">{orderData.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-yellow-200">
                      <span className="text-gray-600 font-medium">Order Number:</span>
                      <span className="font-bold text-gray-800">#{orderData.number}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-600 font-medium">Total Amount:</span>
                      <span className="text-2xl font-bold text-yellow-600">
                        {orderData.total_amount} SAR
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <button
                  onClick={handleViewOrders}
                  className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                >
                  <ShoppingBag className="w-5 h-5" />
                  View My Orders
                </button>
                <button
                  onClick={handleBackToShop}
                  className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                >
                  <Home className="w-5 h-5" />
                  Back to Shop
                </button>
              </div>
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center animate-fadeIn">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
                <XCircle className="w-24 h-24 text-red-500 relative z-10" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-red-600 mb-4">
                Payment Failed
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">{message}</p>
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8 max-w-md mx-auto">
                <p className="text-sm text-red-800">
                  If you believe this is an error, please contact our support team or try again.
                </p>
              </div>
              <button
                onClick={handleBackToShop}
                className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              >
                <Home className="w-5 h-5" />
                Back to Shop
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
