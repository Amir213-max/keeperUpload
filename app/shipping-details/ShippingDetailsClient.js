"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { graphqlClient } from "@/app/lib/graphqlClient";
import { gql } from "graphql-request";
import {
  Truck,
  Package,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Home,
  ShoppingBag,
  Download,
  Share2,
} from "lucide-react";
import Loader from "../Componants/Loader";

const GET_ORDER_DETAILS = gql`
  query GetOrderDetails($orderId: ID!) {
    order(id: $orderId) {
      id
      number
      total_amount
      shipping_type
      shipping_cost
      created_at
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
        unit_price
        total_price
      }
    }
  }
`;

export default function ShippingDetailsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const shipmentId = searchParams.get("shipment_id");
  const trackingNumber = searchParams.get("tracking");

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await graphqlClient.request(GET_ORDER_DETAILS, {
        orderId: orderId,
      });
      setOrderData(res.order);
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
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
    });
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 text-center">
          <div className="flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="bg-blue-500 p-4 rounded-full relative z-10">
                <Truck className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Shipping Details
            </h1>
            <p className="text-lg text-gray-600">
              Your order is being processed by SMSA Express
            </p>
          </div>
        </div>

        {/* Tracking Information */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-xl p-6 md:p-8 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Tracking Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl shadow-md">
              <p className="text-sm text-gray-500 mb-2">Shipment ID</p>
              <p className="text-xl font-bold text-gray-800 break-all">
                {shipmentId || "Processing..."}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-md">
              <p className="text-sm text-gray-500 mb-2">Tracking Number</p>
              <p className="text-xl font-bold text-blue-600 break-all">
                {trackingNumber || "Will be available soon"}
              </p>
            </div>
          </div>

          {trackingNumber && (
            <div className="mt-6 p-4 bg-white rounded-lg border-2 border-blue-200">
              <p className="text-sm text-gray-600 mb-2">
                Track your shipment on SMSA Express website:
              </p>
              <a
                href={`https://www.smsaexpress.com/tracking/${trackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-semibold underline"
              >
                Track Shipment →
              </a>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {orderData && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingBag className="w-6 h-6 text-yellow-600" />
              <h2 className="text-2xl font-bold text-gray-800">Order Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Order Number</p>
                <p className="font-bold text-gray-800">#{orderData.number}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Order Date</p>
                <p className="font-semibold text-gray-800">{formatDate(orderData.created_at)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-200">
                <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                <p className="text-xl font-bold text-yellow-600">
                  {orderData.total_amount?.toFixed(2) || "0.00"} SAR
                </p>
              </div>
            </div>

            {/* Order Items */}
            {orderData.items && orderData.items.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Items in Shipment</h3>
                <div className="space-y-3">
                  {orderData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.product_name}</p>
                        <div className="flex gap-4 mt-1 text-sm text-gray-500">
                          <span>SKU: {item.product_sku}</span>
                          <span>Qty: {item.quantity}</span>
                        </div>
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
          </div>
        )}

        {/* Shipping Address */}
        {orderData && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">Shipping Address</h2>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Recipient Name</p>
                    <p className="font-semibold text-gray-800">{orderData.user?.name || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Country</p>
                    <p className="font-semibold text-gray-800">
                      {orderData.shipping_country?.name || "Saudi Arabia"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Phone</p>
                    <p className="font-semibold text-gray-800">{orderData.user?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-800">{orderData.user?.email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shipping Status Timeline */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Shipping Status</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-semibold text-gray-800">Order Confirmed</p>
                <p className="text-sm text-gray-500">Your order has been confirmed and payment received</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(orderData?.created_at)}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-semibold text-gray-800">Shipment Created</p>
                <p className="text-sm text-gray-500">
                  Your shipment has been created with SMSA Express
                </p>
                <p className="text-xs text-gray-400 mt-1">Just now</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-semibold text-gray-600">In Transit</p>
                <p className="text-sm text-gray-500">
                  Your package will be picked up and shipped soon
                </p>
                <p className="text-xs text-gray-400 mt-1">Pending</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-semibold text-gray-600">Delivered</p>
                <p className="text-sm text-gray-500">
                  Your package will be delivered to your address
                </p>
                <p className="text-xs text-gray-400 mt-1">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleViewOrders}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
          >
            <ShoppingBag className="w-5 h-5" />
            View All Orders
          </button>
          <button
            onClick={handleBackToShop}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Continue Shopping
          </button>
        </div>

        {/* SMSA Express Info */}
        <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <Truck className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-gray-800 mb-2">SMSA Express</h3>
              <p className="text-sm text-gray-600 mb-3">
                Your order is being shipped via SMSA Express. You will receive updates via email and SMS.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://www.smsaexpress.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-semibold underline"
                >
                  Visit SMSA Website →
                </a>
                {trackingNumber && (
                  <a
                    href={`https://www.smsaexpress.com/tracking/${trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold underline"
                  >
                    Track Shipment →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

