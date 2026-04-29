"use client"
import { useEffect } from "react";

export default function RegisterSWClient() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error("SW registration failed:", err));
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(register, { timeout: 3000 });
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
