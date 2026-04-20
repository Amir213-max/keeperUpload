"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchUserCart, removeItemFromCart } from "../lib/mutations";
import { graphqlRequest } from "../lib/graphqlClientHelper";
import { UPDATE_CART_ITEM_QUANTITY, ADD_ITEM_TO_CART } from "../lib/mutations";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  // 🔹 Helper function to get the correct cart key
  const getCartKey = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user ? `cart_${user.id}` : "guest_cart";
  };

  // 🔹 Load cart with guest cart merging
  const loadCart = useCallback(async () => {
    if (loadingRef.current) return; // Prevent multiple simultaneous loads
    
    try {
      loadingRef.current = true;
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));

      if (user) {
        // ✅ Logged-in user → fetch from backend
        let userCart = await fetchUserCart();

        // 🧩 دمج كارت الزائر في كارت المستخدم بعد تسجيل الدخول
        const guestCart = JSON.parse(localStorage.getItem("guest_cart"))?.lineItems || [];
        if (guestCart.length > 0 && userCart?.id) {
          for (const item of guestCart) {
            try {
              // Use API route proxy to avoid CORS issues
              const unit = Number(
                item.unitPrice ?? item.price ?? item.product?.list_price_amount
              );
              const variantId = item.variantId ?? item.variant_id;
              if (variantId == null || variantId === "") {
                console.warn("⚠️ Skip guest merge: missing variant_id for product", item.productId);
                continue;
              }
              const input = {
                cart_id: userCart.id,
                product_id: item.productId || item.product?.id,
                variant_id: String(variantId),
                quantity: item.quantity,
              };
              if (Number.isFinite(unit) && unit > 0) {
                input.unit_price = unit;
              }
              await graphqlRequest(ADD_ITEM_TO_CART, { input });
            } catch (err) {
              console.warn("⚠️ Failed to merge guest item:", item.productId, err);
            }
          }
          localStorage.removeItem("guest_cart");
          userCart = await fetchUserCart();
        }

        setCart(userCart);
      } else {
        // 🧍 Guest user → load from localStorage
        const guestCart = JSON.parse(localStorage.getItem("guest_cart")) || { lineItems: [] };
        setCart(guestCart);
      }
    } catch (err) {
      console.error("Error loading cart:", err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // 🔹 Save guest cart to localStorage whenever it changes (only for guest users)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user && cart && !loading) {
      localStorage.setItem("guest_cart", JSON.stringify(cart));
    }
  }, [cart, loading]);

  // 🔹 Remove item
  const removeItem = useCallback(async (itemId) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (user) {
        // ✅ Logged-in user → remove via API
        await removeItemFromCart(itemId);
        setCart((prevCart) => ({
          ...prevCart,
          lineItems: prevCart.lineItems.filter((item) => item.id !== itemId),
        }));
      } else {
        // 🧍 Guest user → update localStorage only
        setCart((prevCart) => {
          const updated = {
            ...prevCart,
            lineItems: prevCart.lineItems.filter((item) => item.id !== itemId),
          };
          localStorage.setItem("guest_cart", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error("Error removing item:", err);
    }
  }, []);

  // 🔹 Update item quantity
  const updateQuantity = useCallback(async (itemId, quantity) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (user) {
        // ✅ Logged-in user → update via API
        // Use API route proxy to avoid CORS issues
        await graphqlRequest(UPDATE_CART_ITEM_QUANTITY, {
          id: itemId,
          quantity: quantity,
        });
        setCart((prevCart) => ({
          ...prevCart,
          lineItems: prevCart.lineItems.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      } else {
        // 🧍 Guest user → update localStorage only
        setCart((prevCart) => {
          const updated = {
            ...prevCart,
            lineItems: prevCart.lineItems.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            ),
          };
          localStorage.setItem("guest_cart", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error("Error updating quantity:", err);
    }
  }, []);

  // 🔹 Get cart item count (عدد العناصر المختلفة، مش الكميات)
  const getCartItemCount = useCallback(() => {
    if (!cart || !cart.lineItems) return 0;
    // نحسب عدد العناصر المختلفة (كل item = 1 بغض النظر عن الكمية)
    return cart.lineItems.length;
  }, [cart]);

  // 🔹 Listen for custom cart update events (for syncing within same tab)
  useEffect(() => {
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [loadCart]);

  // 🔹 Initial load
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        loadCart,
        removeItem,
        updateQuantity,
        setCart,
        getCartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
