"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { graphqlClient, setAuthToken } from "../lib/graphqlClient";
import { ADD_ITEM_TO_CART, SIGNIN_MUTATION , CREATE_CART } from "../lib/mutations";
import { useAuth } from "../contexts/AuthContext";
import { GET_USER_CART } from "../lib/mutations";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 جلب أو إنشاء كارت للمستخدم
  async function fetchOrCreateUserCart(userId) {
    const { userCart } = await graphqlClient.request(GET_USER_CART, { user_id: userId });
    if (userCart?.id) return userCart.id;

    const newCart = await graphqlClient.request(CREATE_CART, {
      input: { user_id: userId, item_total: 0, grand_total: 0, shipping_costs: 0 },
    });
    return newCart.createCart.id;
  }
const handleLogin = async (e) => {
  e.preventDefault();

  if (!email || !password) {
    toast.error("Please enter both email and password.");
    return;
  }

  try {
    setLoading(true);

    const res = await graphqlClient.request(SIGNIN_MUTATION, {
      input: { email, password },
    });

    const { token, user, message } = res.signin;

    if (!token) {
      toast.error(message || "Login failed ❌");
      return;
    }

    // ✅ خزّن التوكن في localStorage
    localStorage.setItem("token", token);
    setAuthToken(token);

    // 🧹 امسح guest_id القديم
    localStorage.removeItem("guest_id");

    // 🧩 دمج الكارت الخاص بالضيف مع المستخدم بعد تسجيل الدخول
 // 🧩 دمج كارت الزائر مع كارت المستخدم بعد تسجيل الدخول (نسخة محسّنة)
const guestCart = JSON.parse(localStorage.getItem("guest_cart")) || { lineItems: [] };

if (guestCart.lineItems.length > 0) {
  const userCartId = await fetchOrCreateUserCart(user.id);

  for (const item of guestCart.lineItems) {
    try {
      const variantId = item.variantId ?? item.variant_id;
      if (variantId == null || variantId === "") {
        console.warn("⚠️ Skip guest merge (login): missing variant_id", item.productId);
        continue;
      }
      const unit = Number(
        item.unitPrice ??
          item.price ??
          item.product?.list_price_amount ??
          item.product?.price_range_exact_amount ??
          0
      );
      await graphqlClient.request(ADD_ITEM_TO_CART, {
        input: {
          cart_id: userCartId,
          product_id: item.product?.id || item.productId,
          variant_id: String(variantId),
          quantity: item.quantity,
          ...(Number.isFinite(unit) && unit > 0 ? { unit_price: unit } : {}),
        },
      });
    } catch (err) {
      console.warn("⚠️ Failed to merge guest item:", item.product?.id, err);
    }
  }

  // 🧹 بعد الدمج نحذف كارت الزائر
  localStorage.removeItem("guest_cart");
  localStorage.removeItem("guest_id");
}


    // 💾 خزّن بيانات المستخدم
    localStorage.setItem("user", JSON.stringify(user));

    // 🟢 خزّن بيانات المستخدم في الكونتكست
    login(user, token);

    toast.success("تم تسجيل الدخول بنجاح ✅", { position: "top-right" });

    router.push("/");
  } catch (err) {
    console.error("Login error:", err);
    toast.error("حدث خطأ أثناء تسجيل الدخول ❌");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <Toaster />

      {/* Left Side - Login */}
      <div className="flex flex-col justify-center items-center bg-gray-100 p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            Login to your account
          </h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex items-center border border-gray-300 px-3">
              <Mail className="text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 text-black outline-none"
              />
            </div>
            <div className="flex items-center border border-gray-300 px-3">
              <Lock className="text-gray-400" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 text-black outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black cursor-pointer text-white py-3 hover:bg-amber-600 transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Can’t remember your password?
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Register */}
      <div className="flex flex-col justify-center items-center bg-black text-white p-8">
        <div className="w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold mb-6">New here?</h2>
          <Link
            href="/register"
            className="block w-full bg-yellow-500 text-white py-3 font-semibold hover:bg-amber-600 transition"
          >
            Register with KEEPERsport
          </Link>
        </div>
      </div>
    </div>
  );
}
