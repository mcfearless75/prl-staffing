import { auth } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Waiting for access — PRISM" };

/**
 * Where a signed-in staff account without access lands (middleware sends every
 * "pending" session here). Access is granted by an admin on /settings/staff.
 */
export default async function PendingApprovalPage() {
  const session = await auth();
  const email = session?.user?.email ?? "your account";

  return (
    <main className="flex min-h-screen items-center justify-center bg-prism-canvas px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg ring-1 ring-gray-200">
        <img src="/prl-logo.png" alt="PRL Site Solutions" width={72} height={72} className="mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-gray-900">Waiting for access</h1>
        <p className="mt-3 text-sm text-gray-600">
          You&apos;re signed in as <span className="font-medium text-gray-900">{email}</span>, but this account
          hasn&apos;t been given access to PRISM yet.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          An admin has been told. Once they approve you, refresh this page and you&apos;ll go straight in.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {/* A full page load on purpose: it re-runs the access check after approval. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </a>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
