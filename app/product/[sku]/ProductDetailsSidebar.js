"use client";

import { useEffect, useState } from "react";
import { addToCartTempUser } from "@/app/lib/mutations";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { useCurrency } from "@/app/contexts/CurrencyContext";
import { useCart } from "@/app/contexts/CartContext";
import toast from "react-hot-toast";
import DynamicText from "@/app/components/DynamicText";

export default function ProductDetailsSidebar({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const router = useRouter();
  const { t } = useTranslation();
  const { loadCart } = useCart();
  const {
    convertPrice,
    formatPrice,
    getCurrencySymbol,
    loading: currencyLoading,
  } = useCurrency();

  // 🧩 تجهيز الخصائص من productAttributeValues
  const attributesMap = {};
  product.productAttributeValues?.forEach((val) => {
    if (!attributesMap[val.attribute.label]) {
      attributesMap[val.attribute.label] = [];
    }
    if (!attributesMap[val.attribute.label].includes(val.key)) {
      attributesMap[val.attribute.label].push(val.key);
    }
  });

  // 🔹 إضافة المقاسات من variants إذا لم تكن موجودة في productAttributeValues
  if (product.variants && product.variants.length > 0) {
    // البحث عن label "Size" الموجود في attributesMap
    const existingSizeLabel = Object.keys(attributesMap).find(
      (label) => label.toLowerCase().includes('size')
    );

    // استخراج المقاسات من variants.size (وليس variant.name)
    const sizesFromVariants = [];
    product.variants.forEach((variant) => {
      if (variant.size && variant.size.trim() && !sizesFromVariants.includes(variant.size)) {
        sizesFromVariants.push(variant.size);
      }
    });

    // إذا كان هناك مقاسات من variants
    if (sizesFromVariants.length > 0) {
      if (existingSizeLabel) {
        // إذا كان هناك size label موجود، أضف المقاسات من variants إليه
        sizesFromVariants.forEach((size) => {
          if (!attributesMap[existingSizeLabel].includes(size)) {
            attributesMap[existingSizeLabel].push(size);
          }
        });
      } else {
        // إذا لم يكن هناك size label، أنشئ واحد جديد من variants
        // استخدام "Size" كافتراضي
        const sizeLabel = 'Size';
        attributesMap[sizeLabel] = [...sizesFromVariants];
      }
    }
  }

  // 🛒 إضافة المنتج للسلة
const addToCart = async () => {
  // ✅ التحقق من size فقط (تجاهل color)
  const requiredAttributes = Object.keys(attributesMap).filter(
    (label) =>
      label.toLowerCase().includes("size")
      // إزالة color من التحقق
  );

  const missing = requiredAttributes.filter(
    (attr) => !selectedAttributes[attr]
  );

  if (missing.length > 0) {
    toast.error(`Please select: ${missing.join(", ")}`);
    return;
  }

  // ✅ إزالة color من selectedAttributes قبل الإرسال
  const cleanedAttributes = Object.keys(selectedAttributes).reduce((acc, key) => {
    if (!key.toLowerCase().includes('color')) {
      acc[key] = selectedAttributes[key];
    }
    return acc;
  }, {});

  setAdding(true);
  try {
    const user = JSON.parse(localStorage.getItem("user"));

   if (user) {
  // ✅ لو المستخدم داخل (هيتحفظ في السيرفر)
  await addToCartTempUser(product.id, quantity, product.list_price_amount || 0);
  toast.success(`${product.name} added to your cart!`);
  // ✅ تحديث الـ cart في الـ context
  await loadCart();
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
    attributes: cleanedAttributes, // استخدام cleanedAttributes بدون color
  });
}

  localStorage.setItem(cartKey, JSON.stringify(existingCart));
  toast.success(`${product.name} added to your cart!`);
  // ✅ تحديث الـ cart في الـ context للضيف
  await loadCart();
}

    // ✅ فتح الـ CartSidebar تلقائياً بعد تحديث الـ cart
    setTimeout(() => {
      console.log("🛒 Dispatching openCart event...");
      window.dispatchEvent(new CustomEvent("openCart"));
    }, 300);

  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    toast.error("Failed to add to cart. Please try again.");
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

  // 📦 حساب المخزون من الـ variants.stock
  let totalStockQty = null;
  let minStockQty = null;
  let maxStockQty = null;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    let qtySum = 0;
    let foundQty = false;
    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;

    product.variants.forEach((variant) => {
      const stock = variant?.stock || {};
      const qty = typeof stock.qty === "number" ? stock.qty : null;
      const minQty = typeof stock.minQty === "number" ? stock.minQty : null;
      const maxQty = typeof stock.maxQty === "number" ? stock.maxQty : null;

      if (qty !== null) {
        qtySum += qty;
        foundQty = true;
      }

      if (minQty !== null) {
        minVal = Math.min(minVal, minQty);
      }

      if (maxQty !== null) {
        maxVal = Math.max(maxVal, maxQty);
      }
    });

    if (foundQty) {
      totalStockQty = qtySum;
    }

    if (minVal !== Number.POSITIVE_INFINITY) {
      minStockQty = minVal;
    }

    if (maxVal !== Number.NEGATIVE_INFINITY) {
      maxStockQty = maxVal;
    }
  }


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
      {product.brand_name && (
        <div className="flex items-center gap-3">
          <div className="w-2 h-2  rotate-45" />
          <div className="relative w-16 h-8 sm:w-20 sm:h-10 flex items-center justify-center">
            <img
              src={product.brand_logo_url}
              alt={product.brand_name}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-sm font-semibold text-gray-700 uppercase">
            <DynamicText>{product.brand_name}</DynamicText>
          </span>
        </div>
      )}

      {/* SKU */}
      <div className="text-xs text-gray-400 font-mono">SKU {product.sku}</div>

      {/* Title */}
      <h1 className="text-xl sm:text-xl lg:text-xl font-bold text-gray-900 leading-tight break-words">
        <DynamicText>{product.name}</DynamicText>
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
          // عرض size فقط، تجاهل color تماماً
          label.toLowerCase().includes('size')
          // إزالة color من العرض
      )
      .sort(([a], [b]) => (a.toLowerCase().includes('size') ? -1 : 1))
      .map(([label, values]) => {
        return (
          <div key={label} className="space-y-3 relative">
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
              <DynamicText>{label}</DynamicText>
            </h3>

            {/* عرض الأزرار العادية للـ Sizes فقط */}
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
                    <DynamicText>{val}</DynamicText>
                  </button>
                );
              })}
            </div>
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

        {/* 📦 Stock info (from variants.stock) */}
        {(totalStockQty !== null || minStockQty !== null || maxStockQty !== null) && (
          <p className="text-xs font-semibold text-green-600 mt-1">
            {totalStockQty !== null && (
              <span>
                Available: <span>{totalStockQty}</span>
              </span>
            )}
            {minStockQty !== null && (
              <span>
                {totalStockQty !== null && " · "}Min: <span>{minStockQty}</span>
              </span>
            )}
            {maxStockQty !== null && (
              <span>
                {(totalStockQty !== null || minStockQty !== null) && " · "}Max:{" "}
                <span>{maxStockQty}</span>
              </span>
            )}
          </p>
        )}
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
              {t('ADD TO BASKET') || 'ADD TO BASKET'}
            </>
          )}
        </button>

        <Link
          href="/checkout_1"
          className="w-full cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 sm:py-3 px-4   text-base sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          {t('Checkout') || 'Checkout'}
        </Link>
      </div>
    </div>
  );
}
