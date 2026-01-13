import { useState, useEffect } from "react";
import { fetchUserCart, addToCart } from "../lib/cartQueries";

export default function AddToCartButton({ product }) {
  const [cart, setCart] = useState(null);

  useEffect(() => {
    const initCart = async () => {
      const userCart = await fetchUserCart();
      setCart(userCart);
    };
    initCart();
  }, []);

  const handleAddToCart = async () => {
    if (!cart) return;

    const cartItem = await addToCart(cart.id, product.id, 1, product.list_price_amount || 0);
    alert(`${product.name} added to cart!`);

    setCart({
      ...cart,
      items: [...cart.items, cartItem],
    });
  };

  return (
    <button
      onClick={handleAddToCart}
      className="bg-blue-600 text-white px-4 py-2 "
    >
      Add to Cart
    </button>
  );
}
