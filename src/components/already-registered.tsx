import Link from "next/link";

/**
 * "You are already in PRISM" — shown on the public application and onboarding
 * forms once the entered email is recognised.
 *
 * Exists because both forms used to accept a submission from somebody who
 * already had a record and answer with a cheerful "Submitted!", leaving them
 * expecting a call about an application that was really a duplicate. The office
 * then had two records for one person.
 *
 * The wording splits on `hasLogin` for a reason. Plenty of contractors were
 * imported from spreadsheets and have a record but no password, so telling
 * everyone to "log in" strands exactly the people least able to work out why it
 * will not let them. Both paths still land on /login, which carries Set up
 * account and Forgot password beneath the form.
 */
export function AlreadyRegistered({
  email,
  hasLogin,
  variant = "banner",
}: {
  email: string;
  hasLogin: boolean;
  /** "banner" sits inline above the form; "page" replaces it after a submit. */
  variant?: "banner" | "page";
}) {
  // Prefills the portal's email box so they are one password from being in.
  const loginHref = `/login?email=${encodeURIComponent(email.trim().toLowerCase())}`;

  const body = (
    <>
      <h2 className={variant === "page" ? "text-xl font-bold text-prism-ink mb-2" : "text-sm font-semibold text-amber-900"}>
        You already have a PRL account
      </h2>
      <p className={variant === "page" ? "text-sm text-gray-600 mb-4" : "mt-1 text-sm text-amber-900"}>
        {hasLogin ? (
          <>
            <strong>{email}</strong> is already registered with PRL Site Solutions. There&apos;s no
            need to apply again — sign in to your portal instead.
          </>
        ) : (
          <>
            <strong>{email}</strong> is already on file with PRL Site Solutions, so you don&apos;t
            need to apply again. You just need to set up a password for your portal.
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={loginHref}
          className="inline-flex items-center rounded-lg bg-prism-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {hasLogin ? "Go to login" : "Set up your password"}
        </Link>
        <span className="text-xs text-gray-600">
          Not you, or think this is a mistake? Call <strong>0800 772 3959</strong>.
        </span>
      </div>
    </>
  );

  if (variant === "page") {
    return (
      <div className="min-h-screen bg-prism-canvas flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-lg border border-prism-line bg-prism-paper p-8 shadow-[0_1px_2px_rgb(27_36_48_/_6%)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-4">
              <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            {body}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4" role="alert">
      {body}
    </div>
  );
}
