"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      // Check user type and redirect accordingly
      const session = await getSession();
      const userType = (session?.user as { userType?: string })?.userType;
      router.push(userType === "contractor" ? "/portal" : "/");
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
      {/* Watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <img
          src="/prl_logo.jpg"
          alt=""
          width={600}
          height={600}
          className="select-none max-w-[80vw]"
        />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 sm:mb-8 text-center">
            <img
              src="/prl_logo.jpg"
              alt="PRL Site Solutions"
              width={80}
              height={80}
              className="mx-auto mb-4 rounded-full w-16 h-16 sm:w-20 sm:h-20"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">PRL Site Solutions</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="you@prlsitesolutions.co.uk"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 sm:py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 active:bg-blue-800 transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="mt-4 text-center">
            {!forgotMode ? (
              <button
                onClick={() => setForgotMode(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Forgot your password?
              </button>
            ) : forgotSent ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                If that email exists, a reset link has been sent. Check your inbox.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Enter your email to receive a password reset link</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={async () => {
                      if (!email) return;
                      setForgotLoading(true);
                      setError("");
                      try {
                        const res = await fetch("/api/auth/forgot-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        setForgotSent(true);
                      } catch (err) {
                        setError("Network error — please try again");
                      }
                      setForgotLoading(false);
                    }}
                    disabled={forgotLoading || !email}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {forgotLoading ? "..." : "Send"}
                  </button>
                </div>
                <button
                  onClick={() => setForgotMode(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Back to login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
