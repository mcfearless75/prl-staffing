export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { IR35Questionnaire } from "./ir35-questionnaire";

export default async function IR35Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contractor = await prisma.contractor.findUnique({
    where: { id },
  });

  if (!contractor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="IR35 Determination"
        description={`Assessing ${contractor.firstName} ${contractor.lastName}`}
        action={
          <Link
            href={`/contractors/${id}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Contractor
          </Link>
        }
      />

      {contractor.ir35Status && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-600">
            Current IR35 status:{" "}
            <span className="font-semibold">{contractor.ir35Status}</span>.
            Completing this assessment will update it.
          </p>
        </div>
      )}

      <div className="mx-auto max-w-2xl">
        <IR35Questionnaire
          contractorId={id}
          contractorName={`${contractor.firstName} ${contractor.lastName}`}
          currentStatus={contractor.ir35Status}
        />
      </div>
    </div>
  );
}
