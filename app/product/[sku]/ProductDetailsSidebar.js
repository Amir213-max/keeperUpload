"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { addToCartTempUser } from "@/app/lib/mutations";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/app/contexts/TranslationContext";
import { useCurrency } from "@/app/contexts/CurrencyContext";
import { useCart } from "@/app/contexts/CartContext";
import toast from "react-hot-toast";
import DynamicText from "@/app/components/DynamicText";
import {
  findVariantBySelectedSize,
  findVariantForSizeValue,
  getVariantQuantityCap,
  guestCartLineKey,
  isSizeLikeAttributeLabel,
  isVariantPurchasable,
  sortSizeOptionValues,
  variantsHaveSizeOnStock,
} from "@/app/lib/variantMatch";

export default function ProductDetailsSidebar({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const { t } = useTranslation();
  const { loadCart } = useCart();
  const { formatPrice, loading: currencyLoading } = useCurrency();

  const variants = product?.variants;

  const attributesMap = useMemo(() => {
    const map = {};
    product.productAttributeValues?.forEach((val) => {
      const label = val.attribute?.label;
      if (!label) return;
      if (!map[label]) map[label] = [];
      if (!map[label].includes(val.key)) map[label].push(val.key);
    });

    if (variants && variants.length > 0) {
      const existingSizeLabel = Object.keys(map).find((label) => isSizeLikeAttributeLabel(label));
      const sizesFromVariants = [];
      variants.forEach((variant) => {
        if (variant.size && variant.size.trim() && !sizesFromVariants.includes(variant.size)) {
          sizesFromVariants.push(variant.size);
        }
      });
      if (sizesFromVariants.length > 0) {
        if (existingSizeLabel) {
          sizesFromVariants.forEach((size) => {
            if (!map[existingSizeLabel].includes(size)) {
              map[existingSizeLabel].push(size);
            }
          });
        } else {
          map.Size = [...sizesFromVariants];
        }
      }
    }
    for (const key of Object.keys(map)) {
      if (isSizeLikeAttributeLabel(key) && Array.isArray(map[key])) {
        map[key] = sortSizeOptionValues(map[key]);
      }
    }
    return map;
  }, [product, variants]);

  const selectedVariant = useMemo(
    () => findVariantBySelectedSize(variants, selectedAttributes),
    [variants, selectedAttributes]
  );

  const badgeLabel = product.productBadges?.[0]?.label || "";
  const discountMatch = badgeLabel.match(/(\d+)%/);

  const basePriceEur = useMemo(() => {
    const fromVariant =
      selectedVariant && typeof selectedVariant.price === "number"
        ? selectedVariant.price
        : null;
    const productBase =
      product.list_price_amount || product.price_range_exact_amount || 0;
    return fromVariant != null && !Number.isNaN(fromVariant) ? fromVariant : productBase;
  }, [selectedVariant, product.list_price_amount, product.price_range_exact_amount]);

  const finalPriceEur = useMemo(() => {
    let v = basePriceEur;
    if (discountMatch) {
      const discountPercent = parseFloat(discountMatch[1], 10);
      v = basePriceEur - (basePriceEur * discountPercent) / 100;
    }
    return v;
  }, [basePriceEur, discountMatch]);

  const listPriceFormatted = currencyLoading ? "..." : formatPrice(basePriceEur);
  const finalPriceFormatted = currencyLoading ? "..." : formatPrice(finalPriceEur);
  const hasDiscount = !!discountMatch;

  const quantityCap = useMemo(() => {
    if (selectedVariant) return getVariantQuantityCap(selectedVariant);
    return 10;
  }, [selectedVariant]);

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), quantityCap));
  }, [quantityCap]);

  const { totalStockQty, minStockQty, maxStockQty, selectedStockLine } = useMemo(() => {
    let totalStockQty = null;
    let minStockQty = null;
    let maxStockQty = null;
    if (Array.isArray(variants) && variants.length > 0) {
      let qtySum = 0;
      let foundQty = false;
      let minVal = Number.POSITIVE_INFINITY;
      let maxVal = Number.NEGATIVE_INFINITY;
      variants.forEach((variant) => {
        const stock = variant?.stock || {};
        const qty = typeof stock.qty === "number" ? stock.qty : null;
        const minQty = typeof stock.minQty === "number" ? stock.minQty : null;
        const maxQ = typeof stock.maxQty === "number" ? stock.maxQty : null;
        if (qty !== null) {
          qtySum += qty;
          foundQty = true;
        }
        if (minQty !== null) minVal = Math.min(minVal, minQty);
        if (maxQ !== null) maxVal = Math.max(maxVal, maxQ);
      });
      if (foundQty) totalStockQty = qtySum;
      if (minVal !== Number.POSITIVE_INFINITY) minStockQty = minVal;
      if (maxVal !== Number.NEGATIVE_INFINITY) maxStockQty = maxVal;
    }
    let selectedStockLine = null;
    if (selectedVariant?.stock) {
      const s = selectedVariant.stock;
      const parts = [];
      if (typeof s.qty === "number") parts.push(`Qty: ${s.qty}`);
      if (typeof s.minQty === "number") parts.push(`Min: ${s.minQty}`);
      if (typeof s.maxQty === "number") parts.push(`Max: ${s.maxQty}`);
      if (s.isInStock === false) parts.push("Out of stock");
      selectedStockLine = parts.length ? parts.join(" · ") : null;
    }
    return { totalStockQty, minStockQty, maxStockQty, selectedStockLine };
  }, [variants, selectedVariant]);

  const addToCart = useCallback(async () => {
    const requiredAttributes = Object.keys(attributesMap).filter((label) =>
      isSizeLikeAttributeLabel(label)
    );
    const missing = requiredAttributes.filter((attr) => !selectedAttributes[attr]);
    if (missing.length > 0) {
      toast.error(`Please select: ${missing.join(", ")}`);
      return;
    }

    if (variantsHaveSizeOnStock(variants)) {
      const picked = Object.entries(selectedAttributes).some(
        ([k, v]) => isSizeLikeAttributeLabel(k) && String(v ?? "").trim()
      );
      if (!picked) {
        toast.error(t("Please select size") || "Please select a size");
        return;
      }
    }

    const cleanedAttributes = Object.keys(selectedAttributes).reduce((acc, key) => {
      if (!key.toLowerCase().includes("color")) acc[key] = selectedAttributes[key];
      return acc;
    }, {});

    let variant = findVariantBySelectedSize(variants, cleanedAttributes);
    if (variants?.length && requiredAttributes.length) {
      if (!variant) {
        toast.error(t("Selected size is not available") || "Selected size is not available");
        return;
      }
      if (!isVariantPurchasable(variant)) {
        toast.error(t("This size is out of stock") || "This size is out of stock");
        return;
      }
      const cap = getVariantQuantityCap(variant);
      if (quantity > cap) {
        toast.error(t("Quantity exceeds stock") || `Maximum quantity for this size is ${cap}`);
        return;
      }
    }
    if (
      !variant &&
      Array.isArray(variants) &&
      variants.length === 1 &&
      !variantsHaveSizeOnStock(variants)
    ) {
      variant = variants[0];
    }

    const unitPrice = basePriceEur;

    setAdding(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (user) {
        if (!variant?.id) {
          toast.error(t("Please select size") || "Please select a valid product option.");
          return;
        }
        await addToCartTempUser(product.id, quantity, unitPrice, variant.id);
        toast.success(`${product.name} added to your cart!`);
        await loadCart();
      } else {
        const cartKey = "guest_cart";
        const existingCart = JSON.parse(localStorage.getItem(cartKey)) || { lineItems: [] };
        const key = guestCartLineKey(product.id, variant?.id ?? null);
        const existingItemIndex = existingCart.lineItems.findIndex(
          (item) => guestCartLineKey(item.productId, item.variantId ?? null) === key
        );

        const linePayload = {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          productId: product.id,
          variantId: variant?.id ?? null,
          variantSku: variant?.variant_sku ?? null,
          variantSize: variant?.size?.trim() || undefined,
          variantStock:
            variant?.stock && typeof variant.stock === "object"
              ? { ...variant.stock }
              : undefined,
          unitPrice,
          quantity,
          price: unitPrice,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            list_price_amount: product.list_price_amount,
            price_range_exact_amount: product.price_range_exact_amount,
            images: product.images || [{ url: product.cover_image?.url || "" }],
            productBadges: product.productBadges || [],
          },
          attributes: cleanedAttributes,
        };

        if (existingItemIndex >= 0) {
          existingCart.lineItems[existingItemIndex].quantity += quantity;
          existingCart.lineItems[existingItemIndex].unitPrice = unitPrice;
          existingCart.lineItems[existingItemIndex].price = unitPrice;
          if (variant?.stock && typeof variant.stock === "object") {
            existingCart.lineItems[existingItemIndex].variantStock = { ...variant.stock };
          }
          if (variant?.size?.trim()) {
            existingCart.lineItems[existingItemIndex].variantSize = variant.size.trim();
          }
        } else {
          existingCart.lineItems.push(linePayload);
        }

        localStorage.setItem(cartKey, JSON.stringify(existingCart));
        toast.success(`${product.name} added to your cart!`);
        await loadCart();
      }

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("openCart"));
      }, 300);
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
      toast.error("Failed to add to cart. Please try again.");
    } finally {
      setAdding(false);
    }
  }, [
    attributesMap,
    selectedAttributes,
    variants,
    quantity,
    product,
    basePriceEur,
    loadCart,
    t,
  ]);

  const sizeEntries = useMemo(
    () =>
      Object.entries(attributesMap).filter(([label]) => isSizeLikeAttributeLabel(label)),
    [attributesMap]
  );

  return (
    <div
      className="
        flex flex-col gap-3 w-full 
        sm:px-2 md:px-3 
        lg:px-0
        max-md:mt-6
      "
    >
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

      <div className="text-xs text-gray-400 font-mono">SKU {product.sku}</div>

      <h1 className="text-xl sm:text-xl lg:text-xl font-bold text-gray-900 leading-tight break-words">
        <DynamicText>{product.name}</DynamicText>
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        {hasDiscount && (
          <span className="text-sm text-gray-400 line-through">{listPriceFormatted}</span>
        )}
        <span className="text-xl sm:text-xl font-bold text-gray-900">{finalPriceFormatted}</span>
        {discountMatch && (
          <span className="bg-yellow-400 text-gray-900 text-sm font-bold px-2 py-1  ">
            {discountMatch[0]}
          </span>
        )}
      </div>

      {Object.keys(attributesMap).length > 0 && (
        <div className="space-y-6">
          {sizeEntries
            .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
            .map(([label, values]) => (
              <div key={label} className="space-y-3 relative">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                  <DynamicText>{label}</DynamicText>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {values.map((val) => {
                    const v = findVariantForSizeValue(variants, val);
                    const purchasable = !v || isVariantPurchasable(v);
                    const selected = selectedAttributes[label] === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={!purchasable}
                        onClick={() =>
                          setSelectedAttributes((prev) => ({
                            ...prev,
                            [label]: val,
                          }))
                        }
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 border-2 text-sm font-medium transition-all duration-200 ${
                          !purchasable
                            ? "border-gray-100 text-gray-300 cursor-not-allowed line-through"
                            : selected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        <DynamicText>{val}</DynamicText>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">Quantity</h3>
        <div className="relative w-28 sm:w-32">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "Qty" ? null : "Qty")}
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
                {Array.from({ length: quantityCap }, (_, i) => i + 1).map((n) => (
                  <li
                    key={n}
                    onClick={() => {
                      setQuantity(n);
                      setOpenDropdown(null);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${
                      quantity === n
                        ? "bg-gray-100 font-semibold text-gray-900"
                        : "text-gray-700"
                    }`}
                  >
                    {n}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {selectedStockLine && (
          <p className="text-xs font-semibold text-gray-700 mt-1">
            <span className="text-gray-500">Selected: </span>
            {selectedStockLine}
          </p>
        )}
        {!selectedStockLine &&
          (totalStockQty !== null || minStockQty !== null || maxStockQty !== null) && (
            <p className="text-xs font-semibold text-green-600 mt-1">
              {totalStockQty !== null && (
                <span>
                  Available (all sizes): <span>{totalStockQty}</span>
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

      <div
        className="sticky bottom-0 bg-white pt-2 pb-2 
                    flex flex-col gap-2 
                    lg:relative lg:top-6 lg:pb-0"
      >
        <button
          type="button"
          onClick={addToCart}
          disabled={adding}
          className="w-full cursor-pointer bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-300 text-gray-900 font-bold py-2 sm:py-3 px-4   text-base sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          {adding ? (
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent   animate-spin" />
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              {t("ADD TO BASKET") || "ADD TO BASKET"}
            </>
          )}
        </button>

        <Link
          href="/checkout_1"
          className="w-full cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-2 sm:py-3 px-4   text-base sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          {t("Checkout") || "Checkout"}
        </Link>
      </div>
    </div>
  );
}
