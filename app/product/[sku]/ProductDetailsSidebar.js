"use client";

import { useEffect, useState } from "react";
import { addToCartTempUser } from "@/app/lib/mutations";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { useCurrency } from "@/app/contexts/CurrencyContext";

export default function ProductDetailsSidebar({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const router = useRouter();
  const { t } = useTranslation();
  const {
    convertPrice,
    formatPrice,
    getCurrencySymbol,
    loading: currencyLoading,
  } = useCurrency();

  // 🧩 تجهيز الخصائص
  const attributesMap = {};
  product.productAttributeValues?.forEach((val) => {
    if (!attributesMap[val.attribute.label]) {
      attributesMap[val.attribute.label] = [];
    }
    if (!attributesMap[val.attribute.label].includes(val.key)) {
      attributesMap[val.attribute.label].push(val.key);
    }
  });

  // 🛒 إضافة المنتج للسلة
// 🛒 إضافة المنتج للسلة
const addToCart = async () => {
  const requiredAttributes = Object.keys(attributesMap).filter(
    (label) =>
      label.toLowerCase().includes("size") ||
      label.toLowerCase().includes("color")
  );

  const missing = requiredAttributes.filter(
    (attr) => !selectedAttributes[attr]
  );

  if (missing.length > 0) {
    alert(`Please select: ${missing.join(", ")}`);
    return;
  }

  setAdding(true);
  try {
    const user = JSON.parse(localStorage.getItem("user"));

   if (user) {
  // ✅ لو المستخدم داخل (هيتحفظ في السيرفر)
  await addToCartTempUser(product.id, quantity, product.list_price_amount || 0);
  alert(`${product.name} added to your account cart!`);
} else {
  // 🧍‍♂️ الجيست (يتخزن محلي)
  const cartKey = "guest_cart";
  const existingCart = JSON.parse(localStorage.getItem(cartKey)) || { lineItems: [] };

  const existingItemIndex = existingCart.lineItems.findIndex(
    (item) => item.productId === product.id
  );

 if (existingItemIndex >= 0) {
  existingCart.lineItems[existingItemIndex].quantity += quantity;
} else {
  existingCart.lineItems.push({
    productId: product.id,
    quantity,
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      list_price_amount: product.list_price_amount,
      price_range_exact_amount: product.price_range_exact_amount,
      images: product.images || [{ url: product.cover_image?.url || "" }],
      productBadges: product.productBadges || [],
    },
    attributes: selectedAttributes,
  });
}

  localStorage.setItem(cartKey, JSON.stringify(existingCart));
  alert(`${product.name} added to guest cart!`);
}

  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    alert("Failed to add to cart. Check console for details.");
  } finally {
    setAdding(false);
  }
};


  // 💰 الأسعار مع خصم إن وجد
  const basePrice = product.list_price_amount || product.price_range_exact_amount || 0;
  let finalPrice = basePrice;
  const badgeLabel = product.productBadges?.[0]?.label || "";
  const discountMatch = badgeLabel.match(/(\d+)%/);

  if (discountMatch) {
    const discountPercent = parseFloat(discountMatch[1]);
    finalPrice = basePrice - (basePrice * discountPercent) / 100;
  }

  const listPriceFormatted = currencyLoading ? "..." : formatPrice(basePrice);
  const finalPriceFormatted = currencyLoading ? "..." : formatPrice(finalPrice);
  const hasDiscount = !!discountMatch;


  // ✅ عند تسجيل الدخول بنقل الكارت الجيست إلى السيرفر
useEffect(() => {
  const mergeGuestCart = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const guestCart = JSON.parse(localStorage.getItem("guest_cart"));

    if (user && guestCart && guestCart.lineItems.length > 0) {
      try {
        console.log("🧩 Merging guest cart with user cart...");

        // لكل منتج في كارت الجيست، نضيفه في كارت اليوزر
        for (const item of guestCart.lineItems) {
          await addToCartTempUser(item.productId, item.quantity, item.price);
        }

        // بعد الدمج نحذف كارت الجيست
        localStorage.removeItem("guest_cart");
        console.log("✅ Guest cart merged successfully!");
      } catch (err) {
        console.error("❌ Error merging guest cart:", err);
      }
    }
  };

  mergeGuestCart();
}, []);



  return (
    <div
      className="
        flex flex-col gap-3 w-full 
        sm:px-2 md:px-3 
        lg:px-0
        max-md:mt-6
      "
    >
      {/* ✅ Brand Section */}
      {product.brand?.name && (
        <div className="flex items-center gap-3">
          <div className="w-2 h-2  rotate-45" />
          <div className="relative w-16 h-8 sm:w-20 sm:h-10 flex items-center justify-center">
            <img
              src={product.brand.logo}
              alt={product.brand.name}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-sm font-semibold text-gray-700 uppercase">
            {product.brand.name}
          </span>
        </div>
      )}

      {/* SKU */}
      <div className="text-xs text-gray-400 font-mono">SKU {product.sku}</div>

      {/* Title */}
      <h1 className="text-xl sm:text-xl lg:text-xl font-bold text-gray-900 leading-tight break-words">
        {product.name}
      </h1>

      {/* ✅ Price Section */}
      <div className="flex flex-wrap items-center gap-3">
        {hasDiscount && (
          <span className="text-sm text-gray-400 line-through">
            {listPriceFormatted}
          </span>
        )}
        <span className="text-xl sm:text-xl font-bold text-gray-900">
          {finalPriceFormatted}
        </span>
        {discountMatch && (
          <span className="bg-yellow-400 text-gray-900 text-sm font-bold px-2 py-1  ">
            {discountMatch[0]}
          </span>
        )}
      </div>

   {Object.keys(attributesMap).length > 0 && (
  <div className="space-y-6">
    {Object.entries(attributesMap)
      .filter(
        ([label]) =>
          label.toLowerCase().includes('size') ||
          label.toLowerCase().includes('color')
      )
      .sort(([a], [b]) => (a.toLowerCase().includes('size') ? -1 : 1))
      .map(([label, values]) => {
        const isColor = label.toLowerCase().includes('color');
        const [open, setOpen] = useState(false);

        return (
          <div key={label} className="space-y-3 relative">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
              {label}
            </h3>

            {isColor ? (
              // 🎨 Dropdown احترافية للألوان
              <div className="relative w-56">
                <button
                  onClick={() => setOpen(!open)}
                  className="w-full flex items-center justify-between border-2 border-gray-300 rounded-lg px-4 py-2 text-gray-700 text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
                >
                  <span className="flex items-center gap-2">
                    {selectedAttributes[label] ? (
                      <>
                        <span
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{
                            backgroundColor: selectedAttributes[label].toLowerCase(),
                          }}
                        />
                        {selectedAttributes[label]}
                      </>
                    ) : (
                      'Select color'
                    )}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      open ? 'rotate-180' : 'rotate-0'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg"
                    >
                      {values.map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            setSelectedAttributes((prev) => ({
                              ...prev,
                              [label]: val,
                            }));
                            setOpen(false);
                          }}
                          className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-all ${
                            selectedAttributes[label] === val ? 'bg-gray-50 font-medium' : ''
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-gray-300 mr-2"
                            style={{ backgroundColor: val.toLowerCase() }}
                          />
                          {val.charAt(0).toUpperCase() + val.slice(1)}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              // ✅ الأزرار العادية للـ Sizes
              <div className="flex flex-wrap gap-2">
                {values.map((val) => {
                  const selected = selectedAttributes[label] === val;
                  return (
                    <button
                      key={val}
                      onClick={() =>
                        setSelectedAttributes((prev) => ({
                          ...prev,
                          [label]: val,
                        }))
                      }
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 border-2 text-sm font-medium transition-all duration-200 ${
                        selected
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
  </div>
)}

      {/* Quantity Selector */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
          Quantity
        </h3>
        <div className="relative w-28 sm:w-32">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === "Qty" ? null : "Qty")
            }
            className="w-full flex justify-between items-center bg-white border border-gray-200   px-3 py-2 hover:border-gray-400 transition-colors"
          >
            <span className="text-gray-900 font-medium">{quantity}</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                openDropdown === "Qty" ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {openDropdown === "Qty" && (
              <motion.ul
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="absolute z-20 w-full mt-1 bg-white border border-gray-200   shadow-lg overflow-hidden"
              >
                {[...Array(10)].map((_, i) => (
                  <li
                    key={i + 1}
                    onClick={() => {
                      setQuantity(i + 1);
                      setOpenDropdown(null);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                      quantity === i + 1
                        ? "bg-gray-100 font-semibold text-gray-900"
                        : "text-gray-700"
                    }`}
                  >
                    {i + 1}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ✅ Buttons Section */}
      <div
        className="sticky bottom-0 bg-white pt-2 pb-2 
                    flex flex-col gap-2 
                    lg:relative lg:top-6 lg:pb-0"
      >
        <button
          onClick={addToCart}
          disabled={adding}
          className="w-full cursor-pointer bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-300 text-gray-900 font-bold py-2 sm:py-3 px-4   text-base sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          {adding ? (
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent   animate-spin" />
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              ADD TO BASKET
            </>
          )}
        </button>

        <Link
          href="/checkout_1"
          className="w-full cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 sm:py-3 px-4   text-base sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
