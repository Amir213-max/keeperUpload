"use client";

import { useState, useEffect } from "react";
import { graphqlClient } from "../lib/graphqlClient";
import { GET_ORDERS } from "../lib/queries"; // استخدم الكويري اللي أرسلتها
import toast from "react-hot-toast";
import Loader from "../Componants/Loader";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { orders } = await graphqlClient.request(GET_ORDERS);
      setOrders(orders);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border   shadow p-4">
            {/* Order Summary */}
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleOrder(order.id)}
            >
              <div>
                <h2 className="font-semibold">
                  Order #{order.number} - {order.payment_status}
                </h2>
                <p className="text-sm text-gray-500">
                  Total: ${order.total_amount.toFixed(2)} | Created at:{" "}
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <button className="text-blue-500 font-medium">
                {expandedOrder === order.id ? "Hide Details" : "View Details"}
              </button>
            </div>

            {/* Order Details */}
            {expandedOrder === order.id && (
              <div className="mt-4 space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center border-b py-2"
                    >
                      <img
                        src={item.product.images?.[0]}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover   mr-4"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          SKU: {item.product_sku} | Quantity: {item.quantity}
                        </p>
                        {item.product.productBadges?.length > 0 && (
                          <div className="flex gap-2 mt-1">
                            {item.product.productBadges.map((badge) => (
                              <span
                                key={badge.id}
                                className={`px-2 py-1   text-xs font-medium ${badge.color}`}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p>${item.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="border-t pt-2">
                  <p>Subtotal: ${order.subtotal.toFixed(2)}</p>
                  <p>VAT: ${order.vat_amount.toFixed(2)}</p>
                  <p>Shipping: ${order.shipping_cost.toFixed(2)}</p>
                  <p className="font-semibold">
                    Total: ${order.total_amount.toFixed(2)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-2">
                  {order.tracking_urls?.length > 0 && (
                    <a
                      href={order.tracking_urls[0]}
                      target="_blank"
                      className="px-4 py-2 bg-blue-500 text-white   hover:bg-blue-600"
                    >
                      Track Order
                    </a>
                  )}
                  <button className="px-4 py-2 bg-green-500 text-white   hover:bg-green-600">
                    Reorder
                  </button>
                  <button className="px-4 py-2 bg-gray-500 text-white   hover:bg-gray-600">
                    Download Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
