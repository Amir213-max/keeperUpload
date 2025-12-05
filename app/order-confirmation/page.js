'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';

export default function OrderConfirmationPage() {
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    const orderData = localStorage.getItem("orderDetails");
    if (orderData) {
      setOrderDetails(JSON.parse(orderData));
    }
  }, []);

  if (!orderDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#f9f9f9] px-4 py-12 text-center">
      <FaCheckCircle className="text-green-500 text-6xl mb-4" />
      <h1 className="text-3xl font-bold mb-2 text-[#1f2323]">Order Confirmed!</h1>
      <p className="text-gray-600 mb-6 text-lg">
        Thank you for your purchase. Your order has been successfully placed.
      </p>

      <div className="bg-white shadow-md   p-6 w-full max-w-md text-left text-sm text-gray-800 mb-6">
        <p><strong>🆔 Order Number:</strong> {orderDetails.number}</p>
        <p><strong>🧾 Order ID:</strong> {orderDetails.id}</p>
        {/* Add more fields if available from the GraphQL API */}
        <p className="text-xs text-gray-400 mt-4">Saved from session only</p>
      </div>

      <Link
        href="/"
        className="bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-3   font-semibold transition duration-300"
      >
        Back to Home
      </Link>
    </div>
  );
}
