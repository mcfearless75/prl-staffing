export const dynamic = "force-static";

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="rounded-2xl bg-[#1F4E79] px-6 py-8 text-center mb-6">
          <p className="text-white text-3xl font-bold tracking-widest mb-1">PRISM</p>
          <p className="text-blue-300 text-sm">PRL Site Solutions — Contractor Portal</p>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Install the App</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add PRISM to your home screen for quick access — no app store needed.
          </p>
        </div>

        {/* iPhone */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white text-lg shrink-0">
              🍎
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">iPhone &amp; iPad</p>
              <p className="text-xs text-gray-500">Use Safari browser</p>
            </div>
          </div>
          <ol className="space-y-3 list-none">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F4E79] text-white text-xs font-bold mt-0.5">1</span>
              <p className="text-sm text-gray-700 leading-relaxed">Open <strong>Safari</strong> and go to <strong>www.prismworkforce.online/install</strong></p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F4E79] text-white text-xs font-bold mt-0.5">2</span>
              <p className="text-sm text-gray-700 leading-relaxed">Tap the <strong>Share</strong> button at the bottom — the box with an arrow pointing up ⬆</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F4E79] text-white text-xs font-bold mt-0.5">3</span>
              <p className="text-sm text-gray-700 leading-relaxed">Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F4E79] text-white text-xs font-bold mt-0.5">4</span>
              <p className="text-sm text-gray-700 leading-relaxed">Tap <strong>Add</strong> — PRISM will appear on your home screen like a normal app</p>
            </li>
          </ol>
        </div>

        {/* Android */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-lg shrink-0">
              🤖
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Android Phone</p>
              <p className="text-xs text-gray-500">Use Chrome browser</p>
            </div>
          </div>
          <ol className="space-y-3 list-none">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5">1</span>
              <p className="text-sm text-gray-700 leading-relaxed">Open <strong>Chrome</strong> and go to <strong>www.prismworkforce.online/install</strong></p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5">2</span>
              <p className="text-sm text-gray-700 leading-relaxed">Tap the <strong>three dots ⋮</strong> menu in the top-right corner</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5">3</span>
              <p className="text-sm text-gray-700 leading-relaxed">Tap <strong>&quot;Add to Home screen&quot;</strong></p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold mt-0.5">4</span>
              <p className="text-sm text-gray-700 leading-relaxed">Tap <strong>Add</strong> — PRISM will appear on your home screen</p>
            </li>
          </ol>
        </div>

        {/* Login reminder */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 mb-6 text-center">
          <p className="text-sm font-semibold text-blue-900 mb-1">Already installed?</p>
          <p className="text-xs text-blue-700 mb-3">
            Log in with your email address and the password you set up.
          </p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-[#1F4E79] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#163a5c] transition-colors"
          >
            Go to Login →
          </a>
        </div>

        {/* Help */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>Need help? Contact PRL Site Solutions</p>
          <p>
            <a href="tel:08007723959" className="text-blue-600 font-medium">0800 772 3959</a>
            {" · "}
            <a href="mailto:infotech@prlsitesolutions.co.uk" className="text-blue-600">
              infotech@prlsitesolutions.co.uk
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
