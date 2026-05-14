"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuditorLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auditor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }

      // Token is set as httpOnly cookie by the server — only store display info
      localStorage.setItem("auditor_name", data.name);
      localStorage.setItem("auditor_org", data.organisation);

      router.push("/auditor");
    } catch {
      setError("Network error — please try again");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 sm:mb-8 text-center">
            <img
              src="/nutral-logo.svg"
              alt="Nutral"
              className="mx-auto mb-4 h-16"
            />
            <h1
              className="text-xl sm:text-2xl font-bold"
              style={{ color: "#424A54" }}
            >
              PRL Site Solutions
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#8EA698" }}>
              ISO 9001 Audit Portal
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
                className="block text-sm font-medium"
                style={{ color: "#424A54" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-1"
                style={
                  {
                    "--tw-ring-color": "#8EA698",
                    borderColor: undefined,
                  } as React.CSSProperties
                }
                onFocus={(e) =>
                  (e.target.style.borderColor = "#8EA698")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#d1d5db")
                }
                placeholder="auditor@nutral.co.uk"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "#424A54" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-1"
                onFocus={(e) =>
                  (e.target.style.borderColor = "#8EA698")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#d1d5db")
                }
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-3 sm:py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "#8EA698" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#7a9386")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#8EA698")
              }
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Secure audit access provided by PRL Site Solutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
