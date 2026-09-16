import type { ReactNode } from "react";

export const metadata = {
  title: "How do I log into PRISM? | PRL Site Solutions",
  robots: { index: false, follow: false },
};

function StepList({ children }: { children: ReactNode }) {
  return <ol className="mt-4 space-y-4 list-none">{children}</ol>;
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
        {n}
      </span>
      <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
    </li>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function TroubleItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-r-lg border-l-4 border-amber-400 bg-amber-50 py-2.5 pl-4 pr-3">
      <p className="text-sm font-semibold text-amber-900">&ldquo;{q}&rdquo;</p>
      <p className="mt-1 text-sm text-amber-900/90">{children}</p>
    </div>
  );
}

export default function PrismLoginHelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center mb-8">
            <img src="/prl-logo.png" alt="PRL" className="mx-auto h-16 w-16 rounded-full mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">How do I log into PRISM?</h1>
            <p className="mt-1 text-sm text-gray-500">
              Follow the steps below in order. No computer skills needed.
            </p>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-center mb-8">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Step 0 — open a web browser and go to
            </p>
            <p className="mt-1 font-mono text-base font-semibold text-blue-900">
              www.prismworkforce.online
            </p>
          </div>

          {/* PRL STAFF */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              If you work in the PRL office
            </h2>
            <StepList>
              <Step n={1}>
                Type <strong>www.prismworkforce.online</strong> into your browser and press Enter.
              </Step>
              <Step n={2}>
                Scroll down to the heading <strong>PRL Staff</strong> and click{" "}
                <strong>Sign in with Microsoft 365</strong>. You don&rsquo;t need to fill in the
                email and password boxes above it.
              </Step>
              <Step n={3}>
                Sign in with your normal work email (ending <strong>@prlsitesolutions.co.uk</strong>)
                and your usual Microsoft password — the same one you use for Outlook or Teams.
              </Step>
              <Step n={4}>Done. PRISM opens straight onto your Dashboard.</Step>
            </StepList>
            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm font-medium text-gray-700">What you&rsquo;ll see next:</p>
              <ChipRow
                items={[
                  "Dashboard",
                  "Assignments",
                  "Timesheets",
                  "Billing",
                  "Compliance",
                  "Clients",
                  "Reports",
                  "Help",
                ]}
              />
            </div>
          </section>

          {/* CONTRACTORS */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              If you&rsquo;re a contractor on site
            </h2>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-green-700">
              First time ever signing in
            </p>
            <StepList>
              <Step n={1}>
                Type <strong>www.prismworkforce.online</strong> into your browser and press Enter.
              </Step>
              <Step n={2}>
                Click the link near the bottom that says{" "}
                <strong>New contractor? Set up your account</strong>.
              </Step>
              <Step n={3}>Type in the email address PRL already has for you.</Step>
              <Step n={4}>
                Make yourself a password — at least <strong>10 characters</strong>, with some
                numbers mixed in.
              </Step>
              <Step n={5}>You can tell us what job you do if it asks — that bit is optional.</Step>
              <Step n={6}>
                Tap <strong>Go to Login</strong>, then sign in with the email and password you
                just made.
              </Step>
            </StepList>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Every time after that
            </p>
            <StepList>
              <Step n={1}>Go to <strong>www.prismworkforce.online</strong>.</Step>
              <Step n={2}>Type your email in the first box, your password in the second.</Step>
              <Step n={3}>Click the blue <strong>Sign in</strong> button.</Step>
            </StepList>

            <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm font-medium text-gray-700">What you&rsquo;ll see next:</p>
              <ChipRow
                items={[
                  "Home",
                  "Timesheets",
                  "Expenses",
                  "Holiday",
                  "Documents",
                  "Compliance",
                  "Profile",
                  "Pay Query",
                ]}
              />
            </div>
          </section>

          {/* TROUBLESHOOTING */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
              If something goes wrong
            </h2>
            <div className="space-y-3">
              <TroubleItem q="Invalid email or password">
                Check you&rsquo;ve typed it correctly — watch out for Caps Lock. Still stuck? Use{" "}
                <strong>Forgot your password?</strong> under the sign-in boxes.
              </TroubleItem>
              <TroubleItem q="I've forgotten my password">
                Click <strong>Forgot your password?</strong> on the sign-in screen and type your
                email. A link will land in your inbox — click it within{" "}
                <strong>1 hour</strong>{" "}or you&rsquo;ll need to ask again.
              </TroubleItem>
              <TroubleItem q="Too many attempts / Too Many Requests">
                Stop trying for a bit. Wait <strong>30 minutes</strong> and try again with the
                right password.
              </TroubleItem>
              <TroubleItem q="No contractor account found for this email">
                PRL hasn&rsquo;t added you to the system yet. Contact the office and ask them to
                set you up before trying again.
              </TroubleItem>
              <TroubleItem q="This account is already set up">
                You&rsquo;ve made a password once already. Use <strong>Forgot your password?</strong>{" "}
                instead of <strong>Set up your account</strong>.
              </TroubleItem>
              <TroubleItem q="Nothing happens when I click Sign in with Microsoft 365">
                That button only works for{" "}
                <strong>@prlsitesolutions.co.uk</strong>{" "}email addresses. If yours
                doesn&rsquo;t end that way, use the ordinary email and password boxes instead.
              </TroubleItem>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Still stuck? Ask the PRL office to help you, or email{" "}
              <a href="mailto:infotech@prlsitesolutions.co.uk" className="text-blue-600 hover:text-blue-700">
                infotech@prlsitesolutions.co.uk
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
