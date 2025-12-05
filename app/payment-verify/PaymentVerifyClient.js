"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { graphqlClient } from "@/app/lib/graphqlClient";
import { gql } from "graphql-request";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  User,
  MapPin,
  CreditCard,
  Calendar,
  ShoppingBag,
  Home,
  Truck,
} from "lucide-react";

const VERIFY_PAYMENT = gql`
mutation VerifyPayment($input: VerifyTapPaymentInput!) {
  verifyTapPayment(input: $input) {
      success
      message
      payment_status
    
      order {
        id
        number
        reference_id
        payment_status
        total_amount
        subtotal
        vat_amount
        shipping_cost
        shipping_type
        created_at
      
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
          unit_price
          total_price
        }
      }
    }
  }
`;

export default function PaymentVerifyClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Try multiple possible parameter names that Tap might use
  const orderId = 
    searchParams.get("order_id") || 
    null;

  const [status, setStatus] = useState("verifying");
  const [orderData, setOrderData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [message, setMessage] = useState("");
  const [smsaData, setSmsaData] = useState(null);
  const [smsaLoading, setSmsaLoading] = useState(false);

  useEffect(() => {
    // Log all URL parameters for debugging
    const allParams = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log("🔍 All URL parameters:", allParams);
    console.log("🔍 Current URL:", window.location.href);
    console.log("🔍 Extracted orderId:", orderId);

    // Function to extract order ID from various sources
    const extractOrderId = () => {
      // 1. Try URL parameters (already done above)
      if (orderId) return orderId;

      // 2. Try localStorage (stored during order creation)
      const storedOrderId = localStorage.getItem("lastOrderId");
      if (storedOrderId) {
        console.log("📦 Found order ID in localStorage:", storedOrderId);
        return storedOrderId;
      }

      // 3. Try to extract from URL hash or path
      const hash = window.location.hash;
      const hashMatch = hash.match(/order[_-]?id[=:]([^&]+)/i);
      if (hashMatch) {
        console.log("📦 Found order ID in URL hash:", hashMatch[1]);
        return hashMatch[1];
      }

      return null;
    };

    const finalOrderId = extractOrderId();

    if (finalOrderId) {
      verifyPaymentWithId(finalOrderId);
    } else {
      setStatus("error");
      setMessage(
        "Order ID is missing from URL. " +
        "Please check your order confirmation email or contact support. " +
        "If you just completed payment, please wait a moment and refresh the page."
      );
      console.error("❌ No order ID found in URL, localStorage, or hash");
      console.error("❌ Full URL:", window.location.href);
    }
  }, [orderId]);

  const verifyPaymentWithId = async (idToVerify) => {
    try {
      console.log("Verifying payment for order:", idToVerify);
      
      const res = await graphqlClient.request(VERIFY_PAYMENT, {
        input: { order_id: idToVerify },
      });

      console.log("Payment verification response:", res);
      const result = res?.verifyTapPayment;

      if (result?.success) {
        setStatus("success");
        setOrderData(result.order);
        setPaymentData(result.payment);
        setMessage(result.message || "Your payment was successful!");

        // ✅ Integrate with SMSA Express if conditions are met
        if (result.order) {
          await handleSMSAIntegration(result.order);
        }
      } else {
        setStatus("failed");
        setMessage(result?.message || "Payment verification failed.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setStatus("error");
      setMessage(
        err.response?.errors?.[0]?.message ||
          err.message ||
          "An error occurred while verifying your payment."
      );
    }
  };

  const verifyPayment = async () => {
    if (!orderId) return;
    await verifyPaymentWithId(orderId);
  };

  const handleSMSAIntegration = async (order) => {
    try {
      // Check if order qualifies for SMSA Express
      // const countryCode = order?.shipping_country?.code || order?.shipping_country?.id;
const countryCode = "SA";
      
      const shippingType = order?.shipping_type?.toLowerCase();

      // Only process if: country is SA and shipping type is "normal"
      if (countryCode !== "SA" && countryCode !== 1 && countryCode !== "1") {
        console.log("⏭️ Skipping SMSA: Country is not SA", { countryCode });
        return;
      }

      if (shippingType !== "normal" && shippingType !== "standard") {
        console.log("⏭️ Skipping SMSA: Shipping type is not normal", { shippingType });
        return;
      }

      setSmsaLoading(true);
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
        setSmsaData(result);
        
        // ✅ حذف البيانات من localStorage بعد الاستخدام الناجح
        localStorage.removeItem("smsa_customer_data");
        console.log("🗑️ Removed customer data from localStorage after successful SMSA integration");
        
        // Redirect to shipping details page after a short delay
        setTimeout(() => {
          router.push(
            `/shipping-details?order_id=${order.id}&shipment_id=${result.shipmentId}&tracking=${result.trackingNumber}`
          );
        }, 2000);
      } else {
        console.error("❌ SMSA shipment failed:", result.error);
        setSmsaData({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("❌ SMSA integration error:", error);
      setSmsaData({ success: false, error: error.message });
    } finally {
      setSmsaLoading(false);
    }
  };

  const handleBackToShop = () => {
    router.push("/");
  };

  const handleViewOrders = () => {
    router.push("/myprofile?tab=orders");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {status === "verifying" && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center animate-fadeIn">
            <div className="flex flex-col items-center">
              <Loader2 className="w-20 h-20 text-yellow-400 animate-spin mb-6" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Verifying Payment...
              </h1>
              <p className="text-lg text-gray-600 max-w-md mx-auto">
                Please wait while we confirm your payment and process your order.
              </p>
              <div className="mt-8 w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-yellow-400 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
              </div>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Payment Success Header */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 text-center">
              <div className="flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                  <CheckCircle className="w-24 h-24 text-green-500 relative z-10" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-green-600 mb-4">
                  Payment Successful!
                </h1>
                <p className="text-lg text-gray-600 mb-2">{message}</p>
                {smsaLoading && (
                  <p className="text-sm text-yellow-600 mt-2">
                    Processing shipping details...
                  </p>
                )}
              </div>
            </div>

            {/* Order Details Card */}
            {orderData && (
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Package className="w-6 h-6 text-yellow-600" />
                  <h2 className="text-2xl font-bold text-gray-800">Order Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-yellow-100 p-2 rounded-lg">
                        <ShoppingBag className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Order Number</p>
                        <p className="font-bold text-lg text-gray-800">#{orderData.number}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Order Date</p>
                        <p className="font-semibold text-gray-800">{formatDate(orderData.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <CreditCard className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Payment Status</p>
                        <p className="font-semibold text-green-600 capitalize">
                          {orderData.payment_status || "Paid"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <MapPin className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Shipping Country</p>
                        <p className="font-semibold text-gray-800">
                          {orderData.shipping_country?.name || "Saudi Arabia"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="bg-orange-100 p-2 rounded-lg">
                        <Truck className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Shipping Type</p>
                        <p className="font-semibold text-gray-800 capitalize">
                          {orderData.shipping_type || "Standard"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-200">
                      <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {orderData.total_amount?.toFixed(2) || "0.00"} SAR
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer & Payment Info */}
            {orderData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-800">Customer Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-semibold text-gray-800">{orderData.user?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-semibold text-gray-800">{orderData.user?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-semibold text-gray-800">{orderData.user?.phone || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                {paymentData && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <CreditCard className="w-5 h-5 text-green-600" />
                      <h3 className="text-xl font-bold text-gray-800">Payment Information</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Transaction ID</p>
                        <p className="font-semibold text-gray-800 text-sm break-all">
                          {paymentData.transaction_id || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-semibold text-green-600">
                          {paymentData.amount?.toFixed(2) || "0.00"} {paymentData.currency || "SAR"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-semibold text-green-600 capitalize">
                          {paymentData.status || "Completed"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order Items */}
            {orderData?.items && orderData.items.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Order Items</h3>
                <div className="space-y-3">
                  {orderData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.product_name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.product_sku}</p>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">
                          {(item.total_price || item.unit_price * item.quantity)?.toFixed(2)} SAR
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SMSA Status */}
            {smsaData && (
              <div
                className={`bg-white rounded-2xl shadow-xl p-6 ${
                  smsaData.success ? "border-2 border-green-200" : "border-2 border-yellow-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Truck className={`w-5 h-5 ${smsaData.success ? "text-green-600" : "text-yellow-600"}`} />
                  <h3 className="text-xl font-bold text-gray-800">Shipping Status</h3>
                </div>
                {smsaData.success ? (
                  <div className="space-y-2">
                    <p className="text-green-600 font-semibold">✅ Shipment created with SMSA Express</p>
                    {smsaData.trackingNumber && (
                      <p className="text-sm text-gray-600">
                        Tracking Number: <span className="font-bold">{smsaData.trackingNumber}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Redirecting to shipping details page...
                    </p>
                  </div>
                ) : (
                  <p className="text-yellow-600">
                    ⚠️ Shipping will be processed manually. {smsaData.error}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleViewOrders}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              >
                <ShoppingBag className="w-5 h-5" />
                View My Orders
              </button>
              <button
                onClick={handleBackToShop}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              >
                <Home className="w-5 h-5" />
                Back to Shop
              </button>
            </div>
          </div>
        )}

        {(status === "failed" || status === "error") && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center animate-fadeIn">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
                <XCircle className="w-24 h-24 text-red-500 relative z-10" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-red-600 mb-4">
                {status === "failed" ? "Payment Failed" : "Verification Error"}
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


