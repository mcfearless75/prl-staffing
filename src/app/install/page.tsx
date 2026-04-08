"use client";

import { useState, useEffect } from "react";

const APP_URL = "https://www.prismworkforce.online";
const APK_URL = "https://github.com/mcfearless75/prl-staffing/releases/latest/download/PRISM.apk";

export default function InstallPage() {
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else setPlatform("desktop");

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#005f8c] via-[#003d5c] to-[#001f2e]">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 text-center">
        <img src="/prl_logo.jpg" alt="PRISM" className="mx-auto mb-4 h-20 w-20 rounded-2xl shadow-lg" />
        <h1 className="text-3xl font-bold text-white">PRISM</h1>
        <p className="mt-1 text-sm text-blue-200">PRL Site Solutions</p>
        <p className="mt-3 text-base text-white/90">Get the app on your device</p>
      </div>

      {installed && (
        <div className="mx-auto max-w-md px-6 mb-4">
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 p-4 text-center">
            <p className="text-emerald-200 font-medium">PRISM is installed!</p>
            <a href="/" className="mt-1 inline-block text-sm text-emerald-300 underline">Open PRISM</a>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md px-6">
        {/* Quick Links — always visible */}
        <div className="rounded-xl bg-white/10 backdrop-blur p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-white/80 text-center">Quick Links</h2>
          <a
            href={`${APP_URL}/login`}
            className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-white hover:bg-white/20 transition-all"
          >
            <span className="text-xl">🌐</span>
            <div>
              <p className="text-sm font-semibold">Open Web App</p>
              <p className="text-[10px] text-white/60">Works on any device — no install needed</p>
            </div>
          </a>
          <a
            href={APK_URL}
            className="flex items-center gap-3 rounded-lg bg-[#3DDC84]/20 px-4 py-3 text-white hover:bg-[#3DDC84]/30 transition-all"
          >
            <span className="text-xl">📱</span>
            <div>
              <p className="text-sm font-semibold">Download Android App</p>
              <p className="text-[10px] text-white/60">APK file — install directly on your phone</p>
            </div>
          </a>
          <a
            href={`${APP_URL}/login`}
            className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-white hover:bg-white/20 transition-all"
          >
            <span className="text-xl">🍎</span>
            <div>
              <p className="text-sm font-semibold">iPhone / iPad</p>
              <p className="text-[10px] text-white/60">Open in Safari then &quot;Add to Home Screen&quot;</p>
            </div>
          </a>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-1 rounded-xl bg-white/10 p-1 mb-4">
          {(["android", "ios", "desktop"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                platform === p ? "bg-white text-[#005f8c] shadow" : "text-white/70 hover:text-white"
              }`}
            >
              {p === "android" ? "Android" : p === "ios" ? "iPhone" : "Desktop"}
            </button>
          ))}
        </div>

        {/* Android */}
        {platform === "android" && (
          <div className="space-y-3">
            {deferredPrompt && (
              <button onClick={handleInstall} className="w-full rounded-xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg hover:bg-emerald-600 active:scale-[0.98]">
                Install PRISM App
              </button>
            )}
            <a href={APK_URL} className="block w-full rounded-xl bg-[#3DDC84] py-4 text-center text-base font-bold text-black shadow-lg hover:bg-[#32c974] active:scale-[0.98]">
              Download PRISM.apk
            </a>
            <p className="text-center text-[10px] text-blue-300">Allow &quot;Install from unknown sources&quot; if prompted</p>

            <div className="flex items-center gap-3 my-1"><div className="flex-1 border-t border-white/20" /><span className="text-[10px] text-white/40">or add to home screen</span><div className="flex-1 border-t border-white/20" /></div>

            <div className="rounded-xl bg-white/10 backdrop-blur p-5">
              <ol className="space-y-3 text-sm text-white/90">
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">1</span><span>Open <strong>Chrome</strong> → go to <strong>prismworkforce.online</strong></span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">2</span><span>Tap <strong>three dots ⋮</strong> (top right)</span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">3</span><span>Tap <strong>&quot;Add to Home screen&quot;</strong> → <strong>&quot;Add&quot;</strong></span></li>
              </ol>
            </div>
          </div>
        )}

        {/* iOS */}
        {platform === "ios" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-white/10 backdrop-blur p-5">
              <h2 className="text-base font-bold text-white mb-3">Install on iPhone</h2>
              <ol className="space-y-3 text-sm text-white/90">
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">1</span><span>Open <strong>Safari</strong> (must be Safari!)</span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">2</span><span>Go to <strong>www.prismworkforce.online</strong></span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">3</span><span>Tap the <strong>Share button ↑</strong> at the bottom</span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">4</span><span>Tap <strong>&quot;Add to Home Screen&quot;</strong> → <strong>&quot;Add&quot;</strong></span></li>
              </ol>
            </div>
            <div className="rounded-xl bg-amber-500/20 border border-amber-400/30 p-3">
              <p className="text-xs text-amber-200"><strong>Must use Safari</strong> — iPhone only supports home screen apps from Safari.</p>
            </div>
          </div>
        )}

        {/* Desktop */}
        {platform === "desktop" && (
          <div className="space-y-3">
            {deferredPrompt && (
              <button onClick={handleInstall} className="w-full rounded-xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg hover:bg-emerald-600">
                Install PRISM Desktop App
              </button>
            )}
            <div className="rounded-xl bg-white/10 backdrop-blur p-5">
              <h2 className="text-base font-bold text-white mb-3">Install on Desktop</h2>
              <ol className="space-y-3 text-sm text-white/90">
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">1</span><span>Open <strong>Chrome</strong> → go to <strong>www.prismworkforce.online</strong></span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">2</span><span>Click the <strong>install icon ⊕</strong> in the address bar</span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">3</span><span>Click <strong>&quot;Install&quot;</strong></span></li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pb-12 text-center">
          <a href="/login" className="inline-block rounded-xl bg-white/20 backdrop-blur px-8 py-3 text-sm font-medium text-white hover:bg-white/30">
            Or just use the web version →
          </a>
          <p className="mt-4 text-[10px] text-blue-300/50">PRISM by PRL Site Solutions | v1.0</p>
        </div>
      </div>
    </div>
  );
}
