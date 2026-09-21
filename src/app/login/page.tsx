"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { defaultBrand } from "@/lib/brand";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefill from ?email=, which is how the public forms hand over somebody who
  // turned out to be registered already: they arrive here mid-application, and
  // retyping the address they just entered is a pointless extra step — and one
  // more chance to typo it and be told the account does not exist.
  useEffect(() => {
    const urlEmail = searchParams.get("email");
    if (urlEmail) setEmail(urlEmail.toLowerCase().trim());
  }, [searchParams]);

  // Detect NextAuth error redirects (e.g. ?error=CredentialsSignin)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "CredentialsSignin" || urlError === "Configuration") {
      setError("Invalid email or password. Please try again.");
    } else if (urlError) {
      setError("Sign in failed. Please try again.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      // Successful login — get session and redirect
      const session = await getSession();
      const userType = (session?.user as { userType?: string })?.userType;
      const dest = userType === "contractor" ? "/portal" : "/";
      // Use window.location for a hard redirect — avoids router caching issues
      window.location.href = dest;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-prism-bad/10 p-3 text-sm text-prism-bad border border-prism-bad/20">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-prism-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-prism-line bg-prism-paper px-3 py-2.5 text-base sm:text-sm focus:border-prism-ink focus:outline-none focus:ring-2 focus:ring-prism-ink/20"
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-prism-ink">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-prism-line bg-prism-paper px-3 py-2.5 pr-10 text-base sm:text-sm focus:border-prism-ink focus:outline-none focus:ring-2 focus:ring-prism-ink/20"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-prism-ink-muted hover:text-prism-ink transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] rounded-md bg-prism-ink px-4 py-3 sm:py-2.5 text-sm font-medium text-prism-paper hover:bg-prism-ink/90 focus:outline-none focus:ring-2 focus:ring-prism-ink/40 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Microsoft SSO Divider */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 border-t border-prism-line" />
        <span className="text-xs text-prism-ink-muted">PRL Staff</span>
        <div className="flex-1 border-t border-prism-line" />
      </div>

      {/* Microsoft SSO Button */}
      <button
        onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
        className="mt-3 flex w-full min-h-[44px] items-center justify-center gap-3 rounded-md border border-prism-line bg-prism-paper px-4 py-3 sm:py-2.5 text-sm font-medium text-prism-ink hover:bg-prism-canvas focus:outline-none focus:ring-2 focus:ring-prism-ink/20 transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
          <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
          <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
        </svg>
        Sign in with Microsoft 365
      </button>

      {/* Forgot Password / New contractor */}
      <div className="mt-4 space-y-2 text-center">
        {!forgotMode ? (
          <>
            <button
              onClick={() => setForgotMode(true)}
              className="block w-full text-sm text-prism-info hover:underline"
            >
              Forgot your password?
            </button>
            <a
              href="/setup-account"
              className="block text-sm text-prism-ink-muted hover:text-prism-ink"
            >
              New contractor? Set up your account →
            </a>
            <a
              href="/help/prism-login"
              className="block text-sm text-prism-ink-muted hover:text-prism-ink"
            >
              Trouble signing in?
            </a>
          </>
        ) : forgotSent ? (
          <div className="rounded-lg bg-prism-ok/10 p-3 text-sm text-prism-ok">
            If that email is registered, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-prism-ink-muted">Enter your email to receive a password reset link</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-md border border-prism-line bg-prism-paper px-3 py-2 text-sm focus:border-prism-ink focus:outline-none focus:ring-2 focus:ring-prism-ink/20"
              />
              <button
                onClick={async () => {
                  if (!email) return;
                  setForgotLoading(true);
                  setError("");
                  try {
                    await fetch("/api/auth/forgot-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    setForgotSent(true);
                  } catch {
                    setError("Network error — please try again");
                  }
                  setForgotLoading(false);
                }}
                disabled={forgotLoading || !email}
                className="rounded-md bg-prism-ink px-4 py-2 text-sm font-medium text-prism-paper hover:bg-prism-ink/90 disabled:opacity-50 transition-colors"
              >
                {forgotLoading ? "..." : "Send"}
              </button>
            </div>
            <button
              onClick={() => setForgotMode(false)}
              className="text-xs text-prism-ink-muted hover:text-prism-ink"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-prism-canvas md:flex-row">
      {/* Ink panel */}
      <div className="relative flex items-center justify-center overflow-hidden bg-prism-ink px-6 py-10 md:w-1/2 md:py-0">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prl-logo.png" alt="" width={420} height={420} className="select-none max-w-[60vw]" />
        </div>
        <div className="relative z-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/prl-logo.png"
            alt="PRL Site Solutions"
            width={64}
            height={64}
            className="mx-auto mb-4 w-14 h-14 sm:w-16 sm:h-16"
          />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-prism-paper">PRISM</h1>
          <p className="mt-2 text-sm text-white/60">PRL Site Solutions — Workforce &amp; Compliance Portal</p>
          <p className="mt-6 text-sm text-white/50">
            Need help? Call <a href={`tel:${defaultBrand.phone.replace(/\s+/g, "")}`} className="text-prism-paper hover:underline">{defaultBrand.phone}</a>
          </p>
        </div>
      </div>

      {/* Paper card */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-lg border border-prism-line bg-prism-paper p-6 sm:p-8 shadow-[0_1px_2px_rgb(27_36_48_/_6%)]">
            <div className="mb-6 text-center md:hidden">
              <h2 className="text-xl font-semibold tracking-tight text-prism-ink">Sign in</h2>
            </div>
            <div className="mb-6 hidden text-center md:block">
              <h2 className="text-xl font-semibold tracking-tight text-prism-ink">Sign in to your account</h2>
            </div>
            <Suspense fallback={<div className="text-center py-4 text-prism-ink-muted text-sm">Loading...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
