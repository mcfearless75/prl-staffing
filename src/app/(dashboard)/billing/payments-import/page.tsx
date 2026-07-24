export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/page-header";
import { PaymentsImportClient } from "./import-client";

export default function PaymentsImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Payments"
        description="Upload or paste a CSV of Reference, Amount, Date to bulk-record invoice payments"
      />
      <PaymentsImportClient />
    </div>
  );
}
