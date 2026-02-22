"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { GET_ORDERS } from "../lib/queries";
import { useRouter } from "next/navigation";
import Loader from "../Componants/Loader";
import PriceDisplay from "../components/PriceDisplay";
import { useCurrency } from "../contexts/CurrencyContext";
import { useTranslation } from "../contexts/TranslationContext";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import DynamicText from "../components/DynamicText";
import { FaSignOutAlt } from "react-icons/fa";

export default function ProfilePage() {
  const { user, token, logout } = useAuth();
  const { cart } = useCart(); // Remove cartLoading - don't wait for cart to load
  const { loading: currencyLoading } = useCurrency();
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const isRTL = lang === "ar";

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  useEffect(() => {
    // Check auth immediately
    const checkAuth = () => {
      // Check localStorage directly for faster auth check
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const storedUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null;
      
      if (storedToken || token || storedUser || user) {
        setAuthChecked(true);
        if (storedToken || token) {
          fetchOrders();
        } else {
          setLoading(false);
        }
      } else {
        // No auth found, redirect immediately
        router.push("/");
      }
    };

    // Check immediately
    checkAuth();
  }, [token, user, router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Add timeout to prevent hanging (10 seconds max)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );
      
      const dataPromise = graphqlRequest(GET_ORDERS);
      const data = await Promise.race([dataPromise, timeoutPromise]);
      
      setOrders(data?.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      // Don't show error toast if it's just a timeout - allow page to render
      if (error.message !== "Request timeout") {
        toast.error(t("Failed to fetch orders") || "فشل في جلب الطلبات");
      }
      setOrders([]); // Set empty array on error to allow page to render
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return t("Not available");
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case "paid":
        return t("Paid");
      case "pending":
        return t("Pending");
      default:
        return t("Unpaid");
    }
  };

  // Show loading only while fetching orders or checking auth
  if (loading || !authChecked) {
    return <Loader />;
  }

  // Redirect if not authenticated (handled in useEffect, but show loader while redirecting)
  if (!token && !user) {
    return <Loader />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-4 md:py-8 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t("Profile")}
            </h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm md:text-base font-medium"
              aria-label={t("Logout") || "تسجيل الخروج"}
            >
              <FaSignOutAlt size={16} />
              <span>{t("Logout") || "Logout"}</span>
            </button>
          </div>
          
          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t("Name")}
              </label>
              <p className="text-base md:text-lg text-gray-900 font-medium">
                {user.name || t("Not available")}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t("Email")}
              </label>
              <p className="text-base md:text-lg text-gray-900 font-medium break-all">
                {user.email || t("Not available")}
              </p>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
            {t("Orders")}
          </h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-gray-500 text-base md:text-lg">{t("No orders yet")}</p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 bg-gray-50 hover:bg-white"
                >
                  <div
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => toggleOrder(order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">
                          {t("Order")} #{order.number || order.id}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs md:text-sm font-medium ${
                            order.payment_status === "paid"
                              ? "bg-green-100 text-green-800"
                              : order.payment_status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {getPaymentStatusText(order.payment_status)}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-500 mb-2">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="text-lg md:text-xl font-bold text-gray-900">
                        <PriceDisplay price={order.total_amount} loading={currencyLoading} />
                      </p>
                    </div>
                    <button 
                      className={`text-gray-600 hover:text-gray-900 transition-colors ml-2 flex-shrink-0 ${
                        isRTL ? "rotate-90" : ""
                      }`}
                      aria-label={expandedOrder === order.id ? t("Hide Details") : t("View Details")}
                    >
                      {expandedOrder === order.id ? "▼" : "▶"}
                    </button>
                  </div>

                  {expandedOrder === order.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs md:text-sm text-gray-600 mb-1">
                            {t("Subtotal")}
                          </p>
                          <p className="text-base md:text-lg font-semibold text-gray-900">
                            <PriceDisplay price={order.subtotal} loading={currencyLoading} />
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs md:text-sm text-gray-600 mb-1">
                            {t("VAT")}
                          </p>
                          <p className="text-base md:text-lg font-semibold text-gray-900">
                            <PriceDisplay price={order.vat_amount} loading={currencyLoading} />
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs md:text-sm text-gray-600 mb-1">
                            {t("Shipping Cost")}
                          </p>
                          <p className="text-base md:text-lg font-semibold text-gray-900">
                            <PriceDisplay price={order.shipping_cost} loading={currencyLoading} />
                          </p>
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-900 mb-3 text-base md:text-lg">
                        {t("Products")}:
                      </h4>
                      <div className="space-y-2 md:space-y-3">
                        {order.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 md:gap-4 p-3 bg-white rounded-lg border border-gray-100"
                          >
                            {item.product?.images?.[0] && (
                              <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                                <Image
                                  src={item.product.images[0]}
                                  alt={item.product_name || "Product"}
                                  fill
                                  className="object-cover rounded"
                                  unoptimized
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm md:text-base truncate">
                                <DynamicText>
                                  {item.product_name || item.product?.name || t("Products")}
                                </DynamicText>
                              </p>
                              <p className="text-xs md:text-sm text-gray-500 mt-1">
                                {t("Quantity")}: {item.quantity} ×{" "}
                                <PriceDisplay price={item.unit_price} loading={currencyLoading} />
                              </p>
                            </div>
                            <div className={`text-right flex-shrink-0 ${isRTL ? "text-left" : ""}`}>
                              <p className="font-semibold text-gray-900 text-sm md:text-base">
                                <PriceDisplay price={item.total_price} loading={currencyLoading} />
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {order.tracking_urls && order.tracking_urls.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            {t("Tracking Links")}:
                          </p>
                          <div className="space-y-1">
                            {order.tracking_urls.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs md:text-sm block break-all"
                              >
                                {url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
            {t("Cart")}
          </h2>
          
          {!cart || !cart.lineItems || cart.lineItems.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-gray-500 mb-4 text-base md:text-lg">{t("Cart is empty")}</p>
              <Link
                href="/"
                className="inline-block bg-black text-white px-6 py-2.5 md:py-3 rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base font-medium"
              >
                {t("Browse Products")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {cart.lineItems.map((item) => {
                // حساب السعر مع مراعاة الخصومات من productBadges (مثل checkout)
                const basePrice = item.product?.list_price_amount || 0;
                const price = item.product?.productBadges?.length > 0
                  ? basePrice - (basePrice * Math.abs(parseFloat(item.product.productBadges[0].label.replace("%", ""))) / 100)
                  : basePrice;
                const itemTotal = price * (item.quantity || 1);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 bg-gray-50 hover:bg-white"
                  >
                    {item.product?.images?.[0] && (
                      <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
                        <Image
                          src={item.product.images[0]}
                          alt={item.product?.name || "Product"}
                          fill
                          className="object-cover rounded"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base mb-1">
                        <DynamicText>{item.product?.name || t("Products")}</DynamicText>
                      </h3>
                      {item.product?.brand_name && (
                        <p className="text-xs md:text-sm text-gray-500 mb-1">
                          <DynamicText>{item.product.brand_name}</DynamicText>
                        </p>
                      )}
                      <p className="text-xs md:text-sm text-gray-600">
                        {t("Quantity")}: {item.quantity}
                      </p>
                    </div>
                    <div className={`text-right flex-shrink-0 ${isRTL ? "text-left" : ""}`}>
                      <p className="font-bold text-gray-900 text-sm md:text-base">
                        <PriceDisplay
                          price={itemTotal}
                          loading={currencyLoading}
                        />
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-base md:text-lg font-semibold text-gray-800">
                    {t("Total")}:
                  </span>
                  <span className="text-lg md:text-xl font-bold text-gray-900">
                    <PriceDisplay 
                      price={
                        cart.grand_total || 
                        cart.item_total || 
                        (cart.lineItems?.reduce((sum, item) => {
                          // حساب السعر مع مراعاة الخصومات من productBadges (مثل checkout)
                          const basePrice = item.product?.list_price_amount || 0;
                          const price = item.product?.productBadges?.length > 0
                            ? basePrice - (basePrice * Math.abs(parseFloat(item.product.productBadges[0].label.replace("%", ""))) / 100)
                            : basePrice;
                          return sum + (price * (item.quantity || 1));
                        }, 0) || 0)
                      } 
                      loading={currencyLoading} 
                    />
                  </span>
                </div>
                <Link
                  href="/shipping-details"
                  className="block bg-black text-white text-center px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base font-medium"
                >
                  {t("Complete Order")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
