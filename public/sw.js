// PRL Site Solutions - Service Worker v4
const CACHE_NAME = "prl-portal-v4";
const STATIC_ASSETS = [
  "/prl_logo.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Never cache these — always go to network
function shouldBypass(url) {
  const u = new URL(url);
  return (
    u.pathname.startsWith("/api/") ||
    u.pathname.startsWith("/login") ||
    u.pathname.startsWith("/_next/") ||
    u.pathname.startsWith("/set-password") ||
    u.pathname.startsWith("/setup-account") ||
    u.pathname.includes("auth") ||
    u.search.includes("token")
  );
}

// Install - cache only static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - wipe ALL old caches immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => caches.open(CACHE_NAME))
  );
  self.clients.claim();
});

// Fetch - network first for everything; only fall back to cache for static assets
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Always bypass to network for auth/API/Next.js chunks
  if (shouldBypass(event.request.url)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache images and icons — not HTML pages
        const contentType = response.headers.get("content-type") || "";
        if (response.status === 200 && (contentType.includes("image") || contentType.includes("font"))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "PRL Site Solutions";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/portal" },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const url = event.notification.data?.url || "/portal";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/portal") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
