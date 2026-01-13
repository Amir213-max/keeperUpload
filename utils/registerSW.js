// utils/registerSW.js
export function registerSW() {
    if ('serviceWorker' in navigator) {
      return navigator.serviceWorker.register('/sw.js'); // ⚡ ارجع الـ Promise
    } else {
      return Promise.reject("Service Worker not supported");
    }
  }
  