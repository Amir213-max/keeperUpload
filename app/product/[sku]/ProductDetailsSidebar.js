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

  // 🧩 Build available sizes from product.variants only
  const sizes = Array.from(
    new Set(
      (product.variants || [])
        .map((v) => {
          // Handle different possible formats: v.size, v.size?.value, etc.
          const sizeValue = typeof v.size === 'object' ? v.size?.value || v.size?.key : v.size;
          return sizeValue;
        })
        .filter(Boolean) // Remove null/undefined/empty strings
    )
  ).sort(); // Sort sizes for better UX

  // 🔍 Debug: Log variants and sizes for troubleshooting
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔍 Product variants:", product.variants);
      console.log("🔍 Extracted sizes:", sizes);
      console.log("🔍 Product data:", {
        hasVariants: !!product.variants,
        variantsLength: product.variants?.length || 0,
        sizesLength: sizes.length,
        variants: product.variants?.map(v => ({ id: v.id, size: v.size, price: v.price }))
      });
    }
  }, [product.variants, sizes]);

  // 🎯 Resolve selected variant based on selected size
  const selectedVariant = product.variants?.find(
    (v) => v.size === selectedAttributes.size
  );


  // 🛒 Add product to cart
  const addToCart = async () => {
    // ✅ Validate size selection if sizes exist
    if (sizes.length > 0 && !selectedAttributes.size) {
      toast.error("Please select size");
      return;
    }

    setAdding(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      // Use selected variant price if available, otherwise fall back to product price
      const priceToUse = selectedVariant?.price || product.list_price_amount || 0;

      if (user) {
        // ✅ Logged in user (saved on server)
        await addToCartTempUser(product.id, quantity, priceToUse);
        toast.success(`${product.name} added to your cart!`);
        // ✅ Update cart in context
        await loadCart();
      } else {
        // 🧍‍♂️ Guest (stored locally)
        const cartKey = "guest_cart";
        const existingCart = JSON.parse(localStorage.getItem(cartKey)) || { lineItems: [] };

        const existingItemIndex = existingCart.lineItems.findIndex(
          (item) =>
            item.productId === product.id &&
            JSON.stringify(item.attributes) === JSON.stringify(selectedAttributes)
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
            attributes: selectedAttributes, // Store size selection
          });
        }

        localStorage.setItem(cartKey, JSON.stringify(existingCart));
        toast.success(`${product.name} added to your cart!`);
        // ✅ Update cart in context for guest
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


  // 💰 Calculate price: use selected variant price if available, otherwise product price
  const basePrice = selectedVariant?.price || product.list_price_amount || product.price_range_exact_amount || 0;
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


  // ✅ Merge guest cart to server when user logs in
  useEffect(() => {
    const mergeGuestCart = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const guestCart = JSON.parse(localStorage.getItem("guest_cart"));

      if (user && guestCart && guestCart.lineItems.length > 0) {
        try {
          console.log("🧩 Merging guest cart with user cart...");

          // For each product in guest cart, add it to user cart
          for (const item of guestCart.lineItems) {
            const priceToUse = item.product?.list_price_amount || item.product?.price_range_exact_amount || 0;
            await addToCartTempUser(item.productId, item.quantity, priceToUse);
          }

          // After merging, delete guest cart
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

      {/* ✅ Size Selection Section */}
      {sizes.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
            Size
          </h3>

          {/* Size buttons */}
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const selected = selectedAttributes.size === size;
              return (
                <button
                  key={size}
                  onClick={() =>
                    setSelectedAttributes((prev) => ({
                      ...prev,
                      size: size,
                    }))
                  }
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 border-2 text-sm font-medium transition-all duration-200 ${
                    selected
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // 🔍 Debug info in development mode
        process.env.NODE_ENV === 'development' && (
          <div className="space-y-3 text-xs text-gray-400">
            <p>⚠️ No sizes available</p>
            <p>Variants: {product.variants?.length || 0}</p>
            <details className="text-xs">
              <summary className="cursor-pointer">Debug info</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify({ variants: product.variants, sizes }, null, 2)}
              </pre>
            </details>
          </div>
        )
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
