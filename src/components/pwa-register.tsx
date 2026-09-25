"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Registers the service worker and push subscription on portal pages.
 *
 * There used to be an "Install PRL Portal" banner here too. It was removed
 * (2026-09-24) because users found it a nuisance; the install steps are still
 * on the portal home page and at /install for anyone who wants them.
 */
export function PWARegister() {
  const pathname = usePathname();

  useEffect(() => {
    const isPortal = pathname.startsWith("/portal");
    const isInstall = pathname === "/install";
    if (!isPortal && !isInstall) return;

    // Register service worker. /install gets it too so Chrome can offer
    // "Install app" there.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    // /install is public and signed-out: no push prompt, and leave Chrome's
    // own install prompt alone because installing is the point of the page.
    if (!isPortal) return;

    // Subscribe to push notifications
    subscribeToPush();

    // Swallow the browser's install event. Leaving it unhandled lets Chrome on
    // Android show its own "Add to home screen" bar instead, which is the same
    // nuisance the old banner was removed for.
    const handler = (e: Event) => e.preventDefault();
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [pathname]);

  return null;
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
