"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Download } from "lucide-react";

export function PWARegister() {
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Only register SW and prompt on portal pages
    if (!pathname.startsWith("/portal")) return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    // Subscribe to push notifications
    subscribeToPush();

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [pathname]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // @ts-expect-error - prompt() exists on BeforeInstallPromptEvent
    deferredPrompt.prompt();
    // @ts-expect-error - userChoice exists
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall || !pathname.startsWith("/portal")) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 mx-4">
      <div className="mx-auto max-w-lg rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Install PRL Portal
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Add to your home screen for quick access, offline support, and notifications.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 active:scale-95 transition"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstall(false)}
                className="rounded-lg bg-white px-4 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={() => setShowInstall(false)} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return; // Already subscribed

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Send subscription to server
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  } catch (error) {
    console.error("Push subscription error:", error);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
