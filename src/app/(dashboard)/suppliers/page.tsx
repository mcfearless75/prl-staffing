export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { Plus, Users, Mail, Phone } from "lucide-react";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { contractors: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        action={
          <Link
            href="/suppliers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </Link>
        }
      />

      {/* Supplier Cards */}
      {suppliers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => {
            const scoreColor =
              supplier.score >= 75
                ? "bg-emerald-500"
                : supplier.score >= 50
                  ? "bg-amber-500"
                  : "bg-red-500";

            return (
              <Link
                key={supplier.id}
                href={`/suppliers/${supplier.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {supplier.name}
                    </h3>
                    <Badge variant={supplier.tier} className="mt-1">
                      {supplier.tier}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{supplier._count.contractors}</span>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      Performance Score
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {supplier.score}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${scoreColor} transition-all`}
                      style={{ width: `${supplier.score}%` }}
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-sm text-gray-500">
                  {supplier.contactName && (
                    <p className="font-medium text-gray-700">
                      {supplier.contactName}
                    </p>
                  )}
                  {supplier.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{supplier.contactEmail}</span>
                    </div>
                  )}
                  {supplier.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{supplier.contactPhone}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No suppliers found.{" "}
            <Link
              href="/suppliers/new"
              className="text-blue-600 hover:underline"
            >
              Add your first supplier
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
