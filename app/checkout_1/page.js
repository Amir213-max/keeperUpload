"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { gql } from "graphql-request";
  import { GET_PRODUCT_BY_SKU } from "@/app/lib/queries";
import { graphqlClient } from "@/app/lib/graphqlClient";

import {
  fetchUserCart,
  REMOVE_ITEM_FROM_CART,
  UPDATE_CART_ITEM_QUANTITY,
} from "../lib/mutations";
import PriceDisplay from "../components/PriceDisplay";

// جلب الدول
const GET_COUNTRIES = gql`
  query {
    countries {
      id
      name
      code
    }
  }
`;

// حساب الشحن من السيرفر
const CALCULATE_SHIPPING = gql`
  query calculateShipping($country_id: ID!) {
    calculateShipping(country_id: $country_id) {
      country {
        id
        name
        code
      }
      normal_shipping {
        cost
      }
      fast_shipping {
        cost
      }
    }
  }
`;

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState(null);
  const [cartId, setCartId] = useState(""); // cartId ديناميكي
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedShipping, setSelectedShipping] = useState("");
  const [shippingCosts, setShippingCosts] = useState({ normal: 0, fast: 0 });
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loadingItem, setLoadingItem] = useState(null);
  const [removingItem, setRemovingItem] = useState(null);

  // ✅ تحديث الكارت للـ guest في localStorage
  const updateGuestCart = (newLineItems) => {
    localStorage.setItem("guest_cart", JSON.stringify({ lineItems: newLineItems }));
    setCart({ id: "guest", lineItems: newLineItems });
  };

  // تحميل الكارت


useEffect(() => {
  const loadCart = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      // 🧠 أولاً: نجلب كارت المستخدم من السيرفر
      let userCart = await fetchUserCart();

      // 🧩 ثانياً: نجلب كارت الزائر إن وُجدت
      const guestCart = JSON.parse(localStorage.getItem("guest_cart"))?.lineItems || [];

      // 🔁 لو فيه كارت زائر، ندمجها مع كارت المستخدم
      if (guestCart.length > 0 && userCart?.id) {
        for (const guestItem of guestCart) {
          try {
            await graphqlClient.request(
              gql`
                mutation AddToCart($input: AddItemToCartInput!) {
                  addItemToCart(input: $input) {
                    id
                  }
                }
              `,
              {
                input: {
                  cart_id: userCart.id,
                  product_id: guestItem.productId, // تأكد إنك بتخزنها كده في guest_cart
                  quantity: guestItem.quantity,
                },
              }
            );
          } catch (err) {
            console.warn("⚠️ Failed to merge guest cart item:", guestItem.productId, err);
          }
        }

        // 🧹 بعد الدمج نحذف كارت الزائر
        localStorage.removeItem("guest_cart");

        // 🔄 نعيد تحميل الكارت النهائية بعد الدمج
        userCart = await fetchUserCart();
      }

      setCart(userCart);
      setCartId(userCart?.id || "");
    } else {
      // 🧍‍♂️ لو المستخدم مش عامل لوجين، نعرض كارت الزائر
      const guestCart = JSON.parse(localStorage.getItem("guest_cart"));
      if (guestCart && guestCart.lineItems.length > 0) {
   const detailedItems = guestCart.lineItems.map((item, index) => {
  const productData = item.product || {}; // ✅ المنتج موجود جوه item.product

  return {
    id: index,
    quantity: item.quantity,
    product: {
      id: productData.id || null,
      name: productData.name || "Unnamed Product",
      sku: productData.sku || "",
      list_price_amount:
        productData.price_range_exact_amount ||
        productData.list_price_amount ||
        item.price ||
        0,
      images: productData.images?.length ? [productData.images[0]] : ["/no-img.png"],
      productBadges: productData.productBadges || [],
    },
  };
});



        setCart({ id: "guest", lineItems: detailedItems });
        setCartId("guest");
      } else {
        setCart({ id: "guest", lineItems: [] });
        setCartId("guest");
      }
    }
  };

  loadCart();
}, []);


  // جلب الدول
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await graphqlClient.request(GET_COUNTRIES);
        setCountries(res.countries);

        // ✅ عرض كل الدول في الكونسول
        console.log("🌍 Available Countries:");
        res.countries.forEach((country) => {
          console.log(`ID: ${country.id} | Name: ${country.name} | Code: ${country.code}`);
        });
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };

    loadCountries();
  }, []);
// 🟢 جلب السعر من SMSA API بناءً على الدولة ونوع الشحن
async function fetchSmsaRate(countryCode, type = "normal") {
  try {
    const response = await fetch("/api/smsa/shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode, type }),
    });

    const data = await response.json();
    if (data.success) {
      console.log("✅ SMSA Shipping:", data);
      return data.cost; // مثال: { cost: 35 }
    } else {
      console.warn("⚠️ SMSA API error:", data.error);
      return 0;
    }
  } catch (err) {
    console.error("❌ Failed to fetch SMSA rate:", err);
    return 0;
  }
}

  // جلب تكاليف الشحن عند اختيار الدولة
  useEffect(() => {
    const fetchShipping = async () => {
      if (!selectedCountry) return;
      try {
    const res = await graphqlClient.request(CALCULATE_SHIPPING, {
  country_id: selectedCountry,
});

const shippingData = res.calculateShipping;

// 🧠 جلب الكود الدولي للدولة
const countryCode = shippingData.country.code;

// 🟢 جلب السعر من SMSA API
const smsaNormal = await fetchSmsaRate(countryCode, "normal");
const smsaFast = await fetchSmsaRate(countryCode, "fast");

// ✅ أولوية: SMSA ثم السيرفر
setShippingCosts({
  normal: smsaNormal || shippingData.normal_shipping?.cost || 0,
  fast: smsaFast || shippingData.fast_shipping?.cost || 0,
});

      } catch (err) {
        console.error("Error fetching shipping:", err);
        setShippingCosts({ normal: 0, fast: 0 });
      }
    };
    fetchShipping();
  }, [selectedCountry]);

  // إزالة عنصر من الكارت
  const handleRemoveItem = async (itemId) => {
    try {
      setRemovingItem(itemId);

      if (cartId === "guest") {
        const updatedLineItems = cart.lineItems.filter((i) => i.id !== itemId);
        updateGuestCart(updatedLineItems);
      } else {
        await graphqlClient.request(REMOVE_ITEM_FROM_CART, { id: itemId });
        setCart((prev) => ({
          ...prev,
          lineItems: prev.lineItems.filter((i) => i.id !== itemId),
        }));
      }
    } catch (err) {
      console.error("Error removing item:", err);
      alert("حدث خطأ أثناء حذف المنتج، حاول مرة أخرى.");
    } finally {
      setRemovingItem(null);
    }
  };

  // تعديل الكمية
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      setLoadingItem(itemId);

      if (cartId === "guest") {
        const updatedLineItems = cart.lineItems.map((i) =>
          i.id === itemId ? { ...i, quantity: newQuantity } : i
        );
        updateGuestCart(updatedLineItems);
      } else {
        await graphqlClient.request(UPDATE_CART_ITEM_QUANTITY, {
          id: itemId,
          quantity: newQuantity,
        });
        setCart((prev) => ({
          ...prev,
          lineItems: prev.lineItems.map((i) =>
            i.id === itemId ? { ...i, quantity: newQuantity } : i
          ),
        }));
      }
    } catch (err) {
      console.error("Error updating quantity:", err);
      alert("حدث خطأ أثناء تحديث الكمية");
    } finally {
      setLoadingItem(null);
    }
  };

  // تطبيق كوبون
  const applyCoupon = () => {
    if (!couponCode) {
      alert("من فضلك أدخل كود الخصم");
      return;
    }
    setAppliedCoupon(couponCode);
    setDiscountAmount(50); // مثال للخصم
    alert(`تم تطبيق الكوبون: ${couponCode}`);
  };

  // حساب Subtotal بعد الخصم
  const cartSubtotal = cart
    ? cart.lineItems.reduce((sum, i) => {
        const price =
          i.product.productBadges?.length > 0
            ? i.product.list_price_amount -
              (i.product.list_price_amount *
                Math.abs(parseFloat(i.product.productBadges[0].label.replace("%", "")))
              ) / 100
            : i.product.list_price_amount || 0;
        return sum + price * i.quantity;
      }, 0)
    : 0;

  const totalAfterDiscount = cartSubtotal - discountAmount;

  const selectedCountryData = countries.find((c) => c.id === selectedCountry);

  const isSaudi =
    selectedCountryData &&
    (selectedCountryData.name.toLowerCase().includes("saudi") ||
      selectedCountryData.code === "SA");

  const taxRate = isSaudi ? 0.15 : 0;
  const taxAmount = totalAfterDiscount * taxRate;

  const shippingCost =
    selectedShipping === "fast"
      ? shippingCosts.fast
      : selectedShipping === "normal"
      ? shippingCosts.normal
      : 0;

  const totalWithTaxAndShipping =
    totalAfterDiscount + taxAmount + shippingCost;

  // متابعة الشحن
  const handleContinue = () => {
    if (!selectedCountry || !selectedShipping) {
      alert("من فضلك اختر الدولة ونوع الشحن");
      return;
    }

    const shippingTypeValue =
      selectedShipping === "fast" ? "express" : "normal";

    const params = new URLSearchParams({
      cartId,
      countryCode: selectedCountryData?.code || "",
      shippingType: shippingTypeValue,
      appliedCoupon: appliedCoupon || "",
      subtotal: totalAfterDiscount?.toFixed(2) || "0",
      shipping: shippingCost?.toFixed(2) || "0",
      isSaudi: isSaudi ? "true" : "false",
    });

    router.push(`/checkout_1/customer?${params.toString()}`);
  };

  if (!cart)
    return (
      <div className="min-h-screen bg-white md:bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin  h-12 w-12 border-b-2 border-[#FFD300] mx-auto mb-4"></div>
          <p className="text-[#111] text-lg">Loading your cart...</p>
        </div>
      </div>
    );

 

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 text-[#111]">
      <div className="bg-white md:bg-gray-50 border-b border-gray-200 md:border-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#111] text-center">
            Checkout
          </h1>
          <div className="w-24 h-1 bg-[#FFD300] mx-auto mt-4 "></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cart Summary */}
          <div className="space-y-6">
            <div className="bg-white shadow-lg p-6 md:p-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-[#FFD300] flex items-center justify-center mr-3">
                  <span className="text-[#111] font-bold text-sm">1</span>
                </div>
                <h2 className="text-2xl font-bold text-[#111]">Your Cart</h2>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {cart.lineItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                      className="relative flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white transition-all duration-200 shadow-sm"
                        title="Remove item"
                      >
                        ✕
                      </button>

                      <div className="flex gap-3 items-center w-full flex-col sm:flex-row sm:items-start">
                        <div className="flex-shrink-0 w-24 h-24 sm:w-20 sm:h-20 bg-gray-200 overflow-hidden">
                          {item.product.images?.[0] ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xs">
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-1 sm:justify-between w-full sm:w-auto text-center sm:text-left">
                          <h3 className="font-semibold text-[#111] text-sm md:text-base line-clamp-2 mb-2 sm:mb-1">
                            {item.product.name}
                          </h3>

                          <div className="flex justify-center sm:justify-start items-center gap-3 mt-1 mb-3">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={loadingItem === item.id}
                              className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-medium text-[#111]">
                              {loadingItem === item.id ? "..." : item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={loadingItem === item.id}
                              className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex justify-center sm:justify-end">
                            <PriceDisplay
                              price={
                                (
                                  item.product.productBadges?.length > 0
                                    ? item.product.list_price_amount -
                                      (item.product.list_price_amount *
                                        Math.abs(parseFloat(item.product.productBadges[0].label.replace("%", "")))
                                      ) / 100
                                    : item.product.list_price_amount
                                ) * item.quantity
                              }
                              size="base"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Coupon Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-[#111] mb-4">
                  Discount Code
                </h3>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    placeholder="Enter discount code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 focus:border-[#FFD300] focus:ring-2 focus:ring-[#FFD300] focus:ring-opacity-20 outline-none transition-all duration-200 text-[#111] placeholder-[#555]"
                  />
                  <button
                    onClick={applyCoupon}
                    className="bg-[#FFD300] text-[#111] px-6 py-3 font-semibold hover:bg-[#E6BE00] transition-colors duration-200 whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Summary */}
          <div className="space-y-6">
            <div className="bg-white shadow-lg p-6 md:p-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-[#FFD300] flex items-center justify-center mr-3">
                  <span className="text-[#111] font-bold text-sm">2</span>
                </div>
                <h2 className="text-2xl font-bold text-[#111]">
                  Shipping Destination
                </h2>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[#111] font-medium mb-2 block">
                    Select Country
                  </span>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setSelectedShipping("");
                    }}
                    className="w-full px-4 py-3 border border-gray-300 focus:border-[#FFD300] focus:ring-2 focus:ring-[#FFD300] outline-none"
                  >
                    <option value="">-- Select Country --</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </label>

                {selectedCountry && (
                  <div className="mt-4">
                    <span className="text-[#111] font-medium mb-2 block">
                      Shipping Type
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedShipping("normal")}
                        className={`flex-1 px-4 py-3 border text-sm font-semibold transition-all duration-200 ${
                          selectedShipping === "normal"
                            ? "border-[#FFD300] bg-[#FFF7CC] text-[#111]"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Normal Shipping (
                        <PriceDisplay price={shippingCosts.normal} />
                        )
                      </button>

                      <button
                        onClick={() => setSelectedShipping("fast")}
                        className={`flex-1 px-4 py-3 border text-sm font-semibold transition-all duration-200 ${
                          selectedShipping === "fast"
                            ? "border-[#FFD300] bg-[#FFF7CC] text-[#111]"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Fast Shipping (
                        <PriceDisplay price={shippingCosts.fast} />
                        )
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white shadow-lg p-6 md:p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-[#111] mb-6">Order Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-[#555]">
                  <span>Subtotal:</span>
                  <PriceDisplay price={cartSubtotal} />
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>- <PriceDisplay price={discountAmount} /></span>
                  </div>
                )}

                {shippingCost > 0 && (
                  <div className="flex justify-between text-[#555]">
                    <span>Shipping:</span>
                    <PriceDisplay price={shippingCost} />
                  </div>
                )}

                {isSaudi && (
                  <div className="flex justify-between text-[#555]">
                    <span>VAT (15%):</span>
                    <span>+ <PriceDisplay price={taxAmount} /></span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-[#111]">
                    <span>Total:</span>
                    <span className="text-[#FFD300]">
                      <PriceDisplay price={totalWithTaxAndShipping} size="lg" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={!selectedCountry || !selectedShipping}
              className={`w-full py-4 px-6 font-bold text-lg shadow-lg transition-all duration-200 transform ${
                !selectedCountry || !selectedShipping
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#FFD300] text-[#111] hover:bg-[#E6BE00] hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              Continue to Shipping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
