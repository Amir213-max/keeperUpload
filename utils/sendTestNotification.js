"use client"
export function sendTestNotification() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification('Test Notification', {
              body: 'If you see this, notifications are working!',
              icon: '/icon.png',
              tag: 'test-notification',
            });
          });
          
    } else {
      alert('Push notifications are not supported in this browser.');
    }
  }
  