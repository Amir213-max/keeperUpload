self.addEventListener("push", (event) => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      data: data.url || "/",
    });
  });
  
  self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  });
  