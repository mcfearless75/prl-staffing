"use client";

import { useState, useEffect } from "react";

export default function InstallPage() {
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) {
      setPlatform("android");
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      setPlatform("ios");
    } else {
      setPlatform("desktop");
    }

    // Listen for PWA install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#005f8c] via-[#003d5c] to-[#001f2e]">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        <img
          src="/prl_logo.jpg"
          alt="PRISM"
          className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg"
        />
        <h1 className="text-3xl font-bold text-white">PRISM</h1>
        <p className="mt-1 text-sm text-blue-200">
          PRL Site Solutions
        </p>
        <p className="mt-4 text-lg text-white/90">
          Install the app on your device
        </p>
      </div>

      {installed && (
        <div className="mx-auto max-w-md px-6 mb-6">
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 p-4 text-center">
            <p className="text-emerald-200 font-medium">
              ✅ PRISM is already installed on this device!
            </p>
            <a
              href="/"
              className="mt-2 inline-block text-sm text-emerald-300 underline"
            >
              Open PRISM →
            </a>
          </div>
        </div>
      )}

      {/* Platform tabs */}
      <div className="mx-auto max-w-md px-6">
        <div className="flex gap-1 rounded-xl bg-white/10 p-1 mb-6">
          {(["android", "ios", "desktop"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                platform === p
                  ? "bg-white text-[#005f8c] shadow"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {p === "android" ? "📱 Android" : p === "ios" ? "🍎 iPhone" : "💻 Desktop"}
            </button>
          ))}
        </div>

        {/* Android Instructions */}
        {platform === "android" && (
          <div className="space-y-4">
            {/* Direct Install Button (PWA) */}
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="w-full rounded-xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-600 transition-all active:scale-[0.98]"
              >
                ⬇️ Install PRISM App
              </button>
            )}

            {/* APK Download */}
            <a
              href="https://github.com/mcfearless75/prl-staffing/releases/latest/download/PRISM.apk"
              className="block w-full rounded-xl bg-[#3DDC84] py-4 text-center text-base font-bold text-black shadow-lg hover:bg-[#32c974] transition-all active:scale-[0.98]"
            >
              ⬇️ Download PRISM App
            </a>
            <p className="text-center text-xs text-blue-300 -mt-2 mb-1">
              Allow &quot;Install from unknown sources&quot; if prompted
            </p>
            <details className="text-center mb-2">
              <summary className="text-[10px] text-blue-400/60 cursor-pointer hover:text-blue-300">Verify APK signature</summary>
              <p className="mt-1 text-[9px] text-blue-400/40 font-mono break-all px-4">
                SHA-256: b57a2b12a54fadcc337ea159abf415637fead05aa0d59a6351e0d62b61ab2805
              </p>
            </details>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 border-t border-white/20" />
              <span className="text-xs text-white/40">or</span>
              <div className="flex-1 border-t border-white/20" />
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur p-6">
              <h2 className="text-lg font-bold text-white mb-1">
                Add to Home Screen
              </h2>
              <p className="text-sm text-blue-200 mb-4">
                No download needed — add straight from Chrome.
              </p>
              <ol className="space-y-4 text-sm text-white/90">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">1</span>
                  <span>Open <strong className="text-white">Chrome</strong> and go to the login page</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">2</span>
                  <span>Tap the <strong className="text-white">three dots ⋮</strong> menu (top right)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">3</span>
                  <span>Tap <strong className="text-white">&quot;Add to Home screen&quot;</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">4</span>
                  <span>Tap <strong className="text-white">&quot;Add&quot;</strong> — PRISM appears on your home screen!</span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* iOS Instructions */}
        {platform === "ios" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white/10 backdrop-blur p-6">
              <h2 className="text-lg font-bold text-white mb-1">
                Install on iPhone
              </h2>
              <p className="text-sm text-blue-200 mb-4">
                Add PRISM to your home screen — it works just like a native app.
              </p>
              <ol className="space-y-4 text-sm text-white/90">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">1</span>
                  <span>Open <strong className="text-white">Safari</strong> (must be Safari, not Chrome)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">2</span>
                  <span>Go to the login page</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">3</span>
                  <span>Tap the <strong className="text-white">Share button</strong> (the square with an arrow ↑) at the bottom</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">4</span>
                  <span>Scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">5</span>
                  <span>Tap <strong className="text-white">&quot;Add&quot;</strong> — PRISM appears on your home screen with the PRL logo!</span>
                </li>
              </ol>
            </div>

            <div className="rounded-xl bg-amber-500/20 border border-amber-400/30 p-4">
              <p className="text-sm text-amber-200">
                <strong>⚠️ Must use Safari</strong> — iPhone only allows home screen apps from Safari, not Chrome or other browsers.
              </p>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur p-4">
              <p className="text-sm text-white/80">
                <strong className="text-white">What you get:</strong> Full-screen app with the PRL logo icon, push notifications, camera access for document uploads, and offline support. No app store needed.
              </p>
            </div>
          </div>
        )}

        {/* Desktop Instructions */}
        {platform === "desktop" && (
          <div className="space-y-4">
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="w-full rounded-xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-600 transition-all"
              >
                ⬇️ Install PRISM Desktop App
              </button>
            )}

            <div className="rounded-xl bg-white/10 backdrop-blur p-6">
              <h2 className="text-lg font-bold text-white mb-1">
                Install on Desktop
              </h2>
              <p className="text-sm text-blue-200 mb-4">
                Install PRISM as a desktop app from Chrome.
              </p>
              <ol className="space-y-4 text-sm text-white/90">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">1</span>
                  <span>Open <strong className="text-white">Chrome</strong> and go to the login page</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">2</span>
                  <span>Click the <strong className="text-white">install icon</strong> in the address bar (⊕) or the three dots menu</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">3</span>
                  <span>Click <strong className="text-white">&quot;Install&quot;</strong></span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pb-12 text-center">
          <a
            href="/login"
            className="inline-block rounded-xl bg-white/20 backdrop-blur px-8 py-3 text-sm font-medium text-white hover:bg-white/30 transition-all"
          >
            Or just use the web version →
          </a>
          <p className="mt-4 text-xs text-blue-300/60">
            PRISM by PRL Site Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
