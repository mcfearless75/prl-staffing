export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PublicFormShell } from "@/components/public-form-shell";
import { isWellFormedSignToken, signLinkState, SIGN_LINK_TTL_DAYS } from "@/lib/new-starter-pipeline";
import { agreementContentFromRow, agreementSummaryHtml, agreementTermsHtml } from "@/lib/supply-agreement-html";
import { AgreementSignForm } from "./sign-form";

// A personal, token-guarded page: never indexed.
export const metadata: Metadata = {
  title: "Your Subcontractor Agreement — PRL Site Solutions",
  robots: { index: false, follow: false },
};

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-2 text-sm text-gray-600">{children}</div>
        <p className="mt-6 text-sm text-gray-600">
          Questions? Call <strong>0800 772 3959</strong> or email{" "}
          <a href="mailto:admin@prlsitesolutions.co.uk" className="text-blue-700 hover:underline">
            admin@prlsitesolutions.co.uk
          </a>
          .
        </p>
      </div>
    </main>
  );
}

/**
 * Public signing page for a subcontractor agreement sent from the new-starter
 * pipeline. The emailed link carries a 32-byte random token; there is no
 * login. Signing is a typed full name plus an "I agree" tick, stamped with
 * the time and IP by /api/agreement/sign.
 */
export default async function AgreementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const agreement = isWellFormedSignToken(token)
    ? await prisma.supplyAgreement.findUnique({ where: { signToken: token } })
    : null;
  const state = signLinkState(agreement);

  if (!agreement || state === "invalid") {
    return (
      <PublicFormShell title="Subcontractor Agreement">
        <Notice title="This link isn't valid">
          It may have been mistyped, or replaced by a newer agreement — please use the link in the most recent email
          from PRL Site Solutions.
        </Notice>
      </PublicFormShell>
    );
  }

  if (state === "signed") {
    const when = agreement.signedAt!.toLocaleString("en-GB", {
      timeZone: "Europe/London",
      dateStyle: "long",
      timeStyle: "short",
    });
    return (
      <PublicFormShell title="Subcontractor Agreement">
        <Notice title="Already signed">
          This agreement was signed{agreement.signedName ? ` by ${agreement.signedName}` : ""} on {when}. There is
          nothing more to do here.
        </Notice>
      </PublicFormShell>
    );
  }

  if (state === "expired") {
    return (
      <PublicFormShell title="Subcontractor Agreement">
        <Notice title="This link has expired">
          Signing links work for {SIGN_LINK_TTL_DAYS} days. Please contact PRL Site Solutions and we will send you a
          new one.
        </Notice>
      </PublicFormShell>
    );
  }

  const content = agreementContentFromRow(agreement);
  // Every value inside is escaped by supply-agreement-html.ts.
  const summary = agreementSummaryHtml(content);
  const terms = agreementTermsHtml(content);

  return (
    <PublicFormShell title="Subcontractor Agreement" subtitle={`PRL Site Solutions — ${content.companyName}`}>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">Hi {content.personName},</p>
          <p className="mt-2 text-sm text-gray-700">
            Here is your subcontractor agreement with PRL Site Solutions. Please read it, then sign at the bottom of
            the page.
          </p>
        </div>
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: summary }} />
        <div dangerouslySetInnerHTML={{ __html: terms }} />
        <AgreementSignForm token={token} personName={content.personName} />
      </main>
    </PublicFormShell>
  );
}
