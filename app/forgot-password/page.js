"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!email) {
      alert("Please enter your email.");
      return;
    }

    console.log("Password reset for:", email);
    alert("Password reset link sent to your email (mock) 📧");
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 p-8">
      <div className="w-full max-w-md bg-white shadow-lg   p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Forgot Password?
        </h2>

        <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
          <div className="flex items-center border border-gray-300   px-3">
            <Mail className="text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-neutral-800 p-3 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-3 cursor-pointer   hover:bg-neutral-700 transition"
          >
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}
