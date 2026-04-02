export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { GdprClientPage } from "./gdpr-client";

export default async function GdprPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { userType?: string; role?: string };
  if (user.userType === "contractor") redirect("/");

  const [contractors, erasureRequests] = await Promise.all([
    prisma.contractor.findMany({
      where: { status: { not: "Inactive" } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.erasureRequest.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isAdmin = user.role === "admin";
  const userEmail = session.user.email || "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="GDPR Data Management"
        description="Subject Access Requests, Right to Erasure, and data privacy compliance"
      />

      <GdprClientPage
        contractors={contractors}
        erasureRequests={JSON.parse(JSON.stringify(erasureRequests))}
        isAdmin={isAdmin}
        userEmail={userEmail}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Privacy Policy</h3>
        <p className="text-sm text-gray-600">
          View the public-facing privacy policy that outlines how PRL Site Solutions handles personal data.
        </p>
        <a
          href="/privacy"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          View Privacy Policy &rarr;
        </a>
      </div>
    </div>
  );
}
