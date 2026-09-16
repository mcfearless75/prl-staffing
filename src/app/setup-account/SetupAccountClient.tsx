"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { RolePicker } from "@/components/role-picker";

type Step = "email" | "password" | "roles" | "done" | "existing";

interface RoleOption {
  id: string;
  name: string;
}

export default function SetupAccountClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/check-contractor-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else if (data.alreadyActivated) {
        setStep("existing");
      } else {
        setFirstName(data.firstName || "");
        setStep("password");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Sign the contractor in immediately so the roles step can rely on a
      // real session (the roles API now requires session.user.contractorId —
      // it no longer trusts a client-supplied email). Role selection is
      // optional, so if sign-in fails for any reason, skip straight to
      // "done" rather than stranding the user — but surface it as a concern.
      try {
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInResult?.error) {
          console.error("setup-account: auto sign-in after password setup failed:", signInResult.error);
          setStep("done");
        } else {
          setStep("roles");
        }
      } catch (signInErr) {
        console.error("setup-account: auto sign-in after password setup threw:", signInErr);
        setStep("done");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  useEffect(() => {
    if (step !== "roles") return;
    let cancelled = false;
    setRolesLoading(true);
    fetch("/api/auth/setup-account/roles")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setRoleOptions(Array.isArray(data.roles) ? data.roles : []);
      })
      .catch(() => {
        if (!cancelled) setRolesError("Could not load job roles.");
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step]);

  async function handleRolesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const roleIds = formData.getAll("jobRoleIds") as string[];

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup-account/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setStep("done");
  }

  if (step === "roles") {
    return (
      <>
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prl-logo.png" alt="PRL Site Solutions" className="mx-auto mb-4 rounded-full w-16 h-16" />
          <h1 className="text-xl font-bold text-gray-900">What do you do?</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pick the job roles that apply to you. This is optional and helps us match you to the right work.
          </p>
        </div>

        <form onSubmit={handleRolesSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          {rolesError && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{rolesError}</div>
          )}

          {rolesLoading ? (
            <p className="text-sm text-gray-500">Loading job roles...</p>
          ) : (
            <RolePicker options={roleOptions} selectedIds={[]} name="jobRoleIds" />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 sm:py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving..." : "Continue"}
          </button>

          <button
            type="button"
            onClick={() => setStep("done")}
            className="w-full text-sm text-gray-400 hover:text-gray-600"
          >
            Skip for now
          </button>
        </form>
      </>
    );
  }

  if (step === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {firstName ? `Welcome, ${firstName}!` : "Account Ready!"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Your PRISM account is set up. You can now sign in with your email and new password.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (step === "existing") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Account Already Set Up</h2>
        <p className="text-sm text-gray-500 mb-2">
          An account for <strong>{email}</strong> already exists.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Sign in with your existing password, or reset it if you've forgotten it.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors mb-3"
        >
          Sign In
        </button>
        <button
          onClick={() => setStep("email")}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Use a different email
        </button>
      </div>
    );
  }

  if (step === "password") {
    return (
      <>
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prl-logo.png" alt="PRL Site Solutions" className="mx-auto mb-4 rounded-full w-16 h-16" />
          <h1 className="text-xl font-bold text-gray-900">
            {firstName ? `Hi ${firstName}!` : "Set Your Password"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a secure password for <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="At least 10 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-gray-400 hover:text-gray-600"
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

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={10}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Type password again"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 sm:py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Setting up..." : "Create My Account"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("email"); setPassword(""); setConfirm(""); setError(""); }}
            className="w-full text-sm text-gray-400 hover:text-gray-600"
          >
            Use a different email
          </button>
        </form>
      </>
    );
  }

  // Step: email
  return (
    <>
      <div className="mb-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/prl-logo.png" alt="PRL Site Solutions" className="mx-auto mb-4 rounded-full w-16 h-16" />
        <h1 className="text-xl font-bold text-gray-900">Set Up Your PRISM Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the email address you received the invite on
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="your@email.com"
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 sm:py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Checking..." : "Continue"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:text-blue-800">Sign in</a>
        </p>
      </div>
    </>
  );
}
