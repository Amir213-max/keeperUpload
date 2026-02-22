"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart } from "lucide-react";
import { useCurrency } from "../contexts/CurrencyContext";
import PriceDisplay from "../components/PriceDisplay";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { ADD_ITEM_TO_CART } from "../lib/mutations";
import { fetchUserCart } from "../lib/mutations";
import toast from "react-hot-toast";
import { gql } from "graphql-request";
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import { useTranslation } from "../contexts/TranslationContext";
import DynamicText from "../components/DynamicText";

const GET_PRODUCT_BY_ID = gql`
  query GetProductById($id: String!) {
    product(id: $id) {
      id
      name
      sku
      images
      list_price_amount
      price_range_exact_amount
      productBadges {
        label
        color
      }
      brand {
        id
        name
        logo
      }
      productAttributeValues {
        id
        key
        attribute {
          id
          label
        }
      }
    }
  }
`;

export default function ProductAttributesModal({ productId, isOpen, onClose, onAddSuccess }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1);
  const { loading: currencyLoading } = useCurrency();
  const { language } = useTranslation();
  const isRTL = language === "ar";

  // جلب بيانات المنتج
  useEffect(() => {
    if (isOpen && productId) {
      const fetchProduct = async () => {
        setLoading(true);
        try {
          // Use API route proxy to avoid CORS issues
          const data = await graphqlRequest(GET_PRODUCT_BY_ID, { id: productId });
          setProduct(data?.product);
          setSelectedAttributes({});
          setQuantity(1);
        } catch (err) {
          console.error("Error fetching product:", err);
          toast.error("Failed to load product");
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [isOpen, productId, onClose]);

  // تجهيز الخصائص
  const attributesMap = {};
  product?.productAttributeValues?.forEach((val) => {
    if (!attributesMap[val.attribute.label]) {
      attributesMap[val.attribute.label] = [];
    }
    if (!attributesMap[val.attribute.label].includes(val.key)) {
      attributesMap[val.attribute.label].push(val.key);
    }
  });

  // حساب السعر
  const basePrice = product?.list_price_amount || 0;
  let finalPrice = basePrice;
  const badgeLabel = product?.productBadges?.[0]?.label || "";
  const discountMatch = badgeLabel.match(/(\d+)%/);
  if (discountMatch) {
    const discountPercent = parseFloat(discountMatch[1]);
    finalPrice = basePrice - (basePrice * discountPercent) / 100;
  }

  // إضافة للباسكت
  const handleAddToCart = async () => {
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
        const userCart = await fetchUserCart();
        const cartId = userCart?.id;
        if (!cartId) {
          toast.error("Cart not found");
          return;
        }

        // Use API route proxy to avoid CORS issues
        await graphqlRequest(ADD_ITEM_TO_CART, {
          input: {
            cart_id: cartId,
            product_id: product.id,
            quantity: quantity,
          },
        });
        toast.success("Added to cart!");
      } else {
        // Guest cart
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
            quantity: quantity,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              list_price_amount: product.list_price_amount,
              price_range_exact_amount: product.price_range_exact_amount,
              images: product.images,
              productBadges: product.productBadges || [],
            },
            attributes: cleanedAttributes, // استخدام cleanedAttributes بدون color
          });
        }

        localStorage.setItem(cartKey, JSON.stringify(existingCart));
        toast.success("Added to cart!");
      }

      if (onAddSuccess) onAddSuccess();
      onClose();
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50 overflow-x-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading product...</p>
                </div>
              ) : product ? (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-white border-b flex justify-between items-center p-4 z-10">
                    <h2 className="text-xl font-bold text-gray-900">Add to Cart</h2>
                    <button
                      onClick={onClose}
                      className="text-gray-500 hover:text-gray-700 transition"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 overflow-x-hidden">
                    <div className=" gap-6">
                      {/* Product Image */}
                      <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4">
                        <img
                          src={product.images?.[0] || "/no-img.png"}
                          alt={product.name}
                          className="w-full h-64 object-contain"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="space-y-4">
                        {/* Brand */}
                        {product.brand_name && (
                          <div className="flex items-center gap-2">
                            {product.brand_logo_url && (
                              <img
                                src={product.brand_logo_url}
                                alt={product.brand_name}
                                className="w-12 h-6 object-contain"
                              />
                            )}
                            <span className="text-sm font-semibold text-gray-700 uppercase">
                              {product.brand_name}
                            </span>
                          </div>
                        )}

                        {/* Name */}
                        <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>

                        {/* SKU */}
                        <p className="text-xs text-gray-400 font-mono">SKU: {product.sku}</p>

                        {/* Price */}
                        <div className="flex items-center gap-3">
                          {discountMatch ? (
                            <>
                              <span className="text-sm text-gray-400 line-through">
                                <PriceDisplay price={basePrice} loading={currencyLoading} />
                              </span>
                              <span className="text-2xl font-bold text-gray-900">
                                <PriceDisplay price={finalPrice} loading={currencyLoading} />
                              </span>
                              {badgeLabel && (
                                <span
                                  className="text-xs font-bold px-2 py-1 text-white"
                                  style={{
                                    backgroundColor: product.productBadges?.[0]?.color || "#888",
                                  }}
                                >
                                  {badgeLabel}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-gray-900">
                              <PriceDisplay price={basePrice} loading={currencyLoading} />
                            </span>
                          )}
                        </div>

                        {/* Attributes */}
                        {Object.keys(attributesMap).length > 0 && (
                          <div className="space-y-4 pt-4 border-t">
                            {Object.entries(attributesMap)
                              .filter(
                                ([label]) =>
                                  // عرض size فقط، تجاهل color تماماً
                                  label.toLowerCase().includes("size")
                                  // إزالة color من العرض
                              )
                              .sort(([a], [b]) =>
                                a.toLowerCase().includes("size") ? -1 : 1
                              )
                              .map(([label, values]) => {
                                return (
                                  <div key={label} className="space-y-2">
                                    <h4 className="text-sm font-medium text-gray-900 uppercase">
                                      <DynamicText>{label}</DynamicText>
                                    </h4>

                                    {/* Desktop View - Flex Wrap (الشاشات الكبيرة) */}
                                    <div className="hidden md:flex flex-wrap gap-2">
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
                                              className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                                                selected
                                                  ? "border-gray-900 bg-gray-900 text-white"
                                                  : "border-gray-200 text-gray-700 hover:border-gray-400"
                                              }`}
                                            >
                                              <DynamicText>{val}</DynamicText>
                                            </button>
                                          );
                                        })}
                                      </div>

                                    {/* Mobile View - Slider (الشاشات الصغيرة) */}
                                    <div className="md:hidden relative my-4 px-0">
                                      <Splide
                                        options={{
                                          type: 'loop',
                                          autoWidth: true,
                                          perMove: 1,
                                          gap: '.5rem',
                                          pagination: false,
                                          arrows: true,
                                          direction: isRTL ? 'rtl' : 'ltr',
                                        }}
                                        aria-label={`${label} options`}
                                        className="w-full"
                                      >
                                        {values.map((val) => {
                                          const selected = selectedAttributes[label] === val;
                                          return (
                                            <SplideSlide
                                              key={val}
                                              className="p-0 m-0 flex justify-center items-center"
                                            >
                                              <button
                                                onClick={() =>
                                                  setSelectedAttributes((prev) => ({
                                                    ...prev,
                                                    [label]: val,
                                                  }))
                                                }
                                                className={`inline-flex items-center justify-center 
                                                  text-sm font-semibold
                                                  px-5 py-2.5 cursor-pointer
                                                  transition-all duration-300 ease-in-out
                                                  whitespace-nowrap w-fit
                                                  rounded-lg
                                                  ${
                                                    selected
                                                      ? 'bg-gradient-to-r text-white from-gray-400 to-gray-500 text-gray-900 shadow-lg transform scale-105'
                                                      : 'bg-white text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50'
                                                  }`}
                                              >
                                                <DynamicText>{val}</DynamicText>
                                              </button>
                                            </SplideSlide>
                                          );
                                        })}
                                      </Splide>

                                      {/* تخصيص تصميم الأسهم بشكل احترافي */}
                                      <style jsx>{`
                                        .splide__arrow {
                                          background-color: #f3f4f6 !important;
                                          color: #6b7280 !important;
                                          width: 28px !important;
                                          height: 28px !important;
                                          border-radius: 50% !important;
                                          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
                                          transition: all 0.3s ease !important;
                                        }

                                        .splide__arrow:hover {
                                          background-color: #e5e7eb !important;
                                          color: #374151 !important;
                                          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15) !important;
                                        }

                                        .splide__arrow svg {
                                          fill: currentColor !important;
                                          width: 14px !important;
                                          height: 14px !important;
                                        }

                                        .splide__arrow--prev {
                                          left: -15px !important;
                                        }

                                        .splide__arrow--next {
                                          right: -15px !important;
                                        }

                                        .splide__arrow:disabled {
                                          opacity: 0.3 !important;
                                          cursor: not-allowed !important;
                                        }
                                      `}</style>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Quantity */}
                        <div className="space-y-2 pt-4 border-t">
                          <h4 className="text-sm font-medium text-gray-900 uppercase">
                            Quantity
                          </h4>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition"
                            >
                              −
                            </button>
                            <span className="text-lg font-bold text-gray-900 w-12 text-center">
                              {quantity}
                            </span>
                            <button
                              onClick={() => setQuantity((q) => q + 1)}
                              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddToCart}
                      disabled={adding}
                      className="flex-1 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-300 text-gray-900 font-bold rounded-lg transition flex items-center justify-center gap-2"
                    >
                      {adding ? (
                        <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart size={20} />
                          Add to Basket
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-600">Product not found</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

