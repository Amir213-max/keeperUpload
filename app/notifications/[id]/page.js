"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function NotificationDetailPage() {
  const params = useSearchParams();

  const message = params.get("message");
  const content = params.get("content");
  const created_at = params.get("created_at");

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/notifications" className="text-blue-600 hover:underline">
        ← Back to Notifications
      </Link>

      <div className="mt-6 p-6 bg-white shadow   border border-gray-200">
        <h1 className="text-2xl font-semibold mb-2 text-black">{message}</h1>
        <p className="text-gray-600 mb-4">
          {new Date(created_at).toLocaleString()}
        </p>
        <p className="text-gray-800 leading-relaxed">
          {content || "No additional details available."}
        </p>
      </div>
    </div>
  );
}
