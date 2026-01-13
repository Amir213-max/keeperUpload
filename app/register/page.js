"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Lock, User } from "lucide-react";
import { graphqlClient } from "../lib/graphqlClient"; 
import { SIGNUP_MUTATION , GET_USER_CART, ADD_ITEM_TO_CART, CREATE_CART } from "../lib/mutations";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { v4 as uuidv4 } from "uuid";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth(); // من AuthContext

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ type: "", message: "" });

  function Toast({ type = "error", message }) {
    return (
      <div
        className={`fixed top-4 right-4 px-4 py-2 shadow-lg z-50 animate-slide-in ${
          type === "success" ? "bg-green-600" : "bg-red-600"
        } text-white`}
      >
        {message}
      </div>
    );
  }

  // 🔹 وظيفة لإضافة عنصر للكارت للمستخدم
  async function addItemToUserCart(cartId, product) {
    const input = {
      cart_id: cartId,
      product_id: product.product_id,
      quantity: product.quantity,
      unit_price: product.unit_price || 0,
    };
    try {
      await graphqlClient.request(ADD_ITEM_TO_CART, { input });
    } catch (err) {
      console.error("Error adding item to user cart:", err);
    }
  }

  // 🔹 جلب أو إنشاء كارت للمستخدم
  async function fetchOrCreateUserCart(userId) {
    const { userCart } = await graphqlClient.request(GET_USER_CART, { user_id: userId });

    if (userCart?.id) return userCart.id;

    const newCart = await graphqlClient.request(CREATE_CART, {
      input: { user_id: userId, item_total: 0, grand_total: 0, shipping_costs: 0 },
    });
    return newCart.createCart.id;
  }

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      setToast({ type: "error", message: "All fields are required." });
      return;
    }

    try {
      setLoading(true);

      const variables = {
        input: {
          name: form.name,
          email: form.email,
          password: form.password,
        },
      };

      const data = await graphqlClient.request(SIGNUP_MUTATION, variables);

      if (data.signup?.token) {
        const user = { 
          id: data.signup.user.id, 
          name: data.signup.user.name, 
          email: data.signup.user.email 
        };

     // 🔹 دمج Guest Cart مع كارت المستخدم الجديد (نسخة محسّنة)
const guestCart = JSON.parse(localStorage.getItem("guest_cart")) || { lineItems: [] };

if (guestCart.lineItems.length > 0) {
  const userCartId = await fetchOrCreateUserCart(user.id);

  for (const item of guestCart.lineItems) {
    await addItemToUserCart(userCartId, {
      product_id: item.product?.id || item.productId,
      quantity: item.quantity,
      unit_price: item.product?.price_range_exact_amount || 0,
    });
  }

  // 🔹 مسح Guest Cart بعد الدمج
  localStorage.removeItem("guest_cart");
  localStorage.removeItem("guest_id");
}


        // 🔹 مسح Guest Cart
        localStorage.removeItem("guest_cart_items");
        localStorage.removeItem("guest_id");

        // 🔹 حفظ التوكن وبيانات المستخدم في AuthContext
        login(user, data.signup.token);

        setToast({ type: "success", message: "🎉 Account created successfully!" });

        // 🔹 تحويل المستخدم للـ Home بعد ثانية واحدة
        setTimeout(() => router.push("/"), 1000);
      } else {
        setToast({ type: "error", message: data.signup?.message || "Something went wrong!" });
      }
    } catch (error) {
      console.error("Signup error:", error);
      const backendError = error.response?.errors?.[0]?.message;

      if (backendError?.toLowerCase().includes("email")) {
        setToast({ type: "error", message: "❌ This email is already registered." });
      } else {
        setToast({
          type: "error",
          message: backendError || "Error creating account. Please try again.",
        });
      }
    } finally {
      setLoading(false);
      setTimeout(() => setToast({ type: "", message: "" }), 4000);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 p-8">
      <div className="w-full max-w-md bg-white shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Create a new account
        </h2>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="flex items-center border border-gray-300 px-3">
            <User className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full cursor-pointer text-black p-3 outline-none"
            />
          </div>

          <div className="flex items-center border border-gray-300 px-3">
            <Mail className="text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full cursor-pointer text-black p-3 outline-none"
            />
          </div>

          <div className="flex items-center border border-gray-300 px-3">
            <Lock className="text-gray-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full cursor-pointer text-black p-3 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 text-white py-3 font-semibold hover:bg-amber-700 transition disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>

      {toast.message && <Toast type={toast.type} message={toast.message} />}
    </div>
  );
}
