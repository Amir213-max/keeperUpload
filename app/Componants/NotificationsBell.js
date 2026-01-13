"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { graphqlClient } from "../lib/graphqlClient";
import { UNREAD_NOTIFICATIONS_QUERY } from "../lib/queries";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

export default function NavbarNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const { token, user } = useAuth(); // ✅ جلب التوكن و الـ user

  useEffect(() => {
    if (!token || !user?.id) return; // ⛔ مش نعمل fetch إلا لو فيه توكن و ID

    const fetchNotifications = async () => {
      try {
        const { unreadNotifications } = await graphqlClient.request(
          UNREAD_NOTIFICATIONS_QUERY,
          { user_id: user.id }, // ✅ بعته للـ query
          {
            Authorization: `Bearer ${token}`,
          }
        );
        setNotifications(unreadNotifications || []);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [token, user]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="relative p-2   hover:bg-amber-400 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray cursor-pointer" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-6 h-5 flex items-center justify-center   animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center sm:justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          ></div>

          <div className="relative mt-20 w-[90vw] max-w-xs sm:max-w-sm bg-white shadow-2xl   overflow-hidden border border-gray-200 animate-fadeIn">
            <div className="p-3 border-b flex justify-between items-center bg-gradient-to-r from-amber-100 to-amber-50">
              <span className="font-semibold text-gray-800 text-sm">
                Notifications
              </span>
              <Link
                href="/notifications"
                className="text-blue-600 text-sm font-medium hover:underline"
                onClick={() => setOpen(false)}
              >
                View All
              </Link>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center p-4">
                  No notifications
                </p>
              ) : (
                notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    href={`/notifications/${notif.id}`}
                    onClick={() => setOpen(false)}
                    className={`block p-3   transition-all duration-200 ${
                      !notif.read_at
                        ? "border-l-4 border-red-500 bg-red-50 hover:bg-red-100"
                        : "border border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <p className="text-gray-800 text-sm">
                        {notif.message || notif.type}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
