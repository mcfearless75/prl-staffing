"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  LIVE_ASSIGNMENT_STATUSES,
  deactivateContractorsWithNoLiveWork,
} from "@/lib/contractor-status";

export async function createCompany(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const postcode = formData.get("postcode") as string;
    const contactName = formData.get("contactName") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const contactPhone = formData.get("contactPhone") as string;

    await prisma.company.create({
      data: {
        name,
        address,
        city,
        postcode,
        contactName,
        contactEmail,
        contactPhone,
      },
    });

    revalidatePath("/companies");
    redirect("/companies");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create company:", error);
    throw new Error("Failed to create company. Please try again.");
  }
}

export async function updateCompany(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const postcode = formData.get("postcode") as string;
    const contactName = formData.get("contactName") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const contactPhone = formData.get("contactPhone") as string;

    await prisma.company.update({
      where: { id },
      data: {
        name,
        address,
        city,
        postcode,
        contactName,
        contactEmail,
        contactPhone,
      },
    });

    revalidatePath(`/companies/${id}`);
    redirect(`/companies/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update company:", error);
    throw new Error("Failed to update company. Please try again.");
  }
}

export type DeleteResult = { type: "ok" | "error"; message: string } | null;

export async function deleteCompany(
  id: string,
  _prevState: DeleteResult,
  _formData: FormData
): Promise<DeleteResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Safety: refuse the delete outright if records outside the owned
  // company/site/department tree still reference this company — these are
  // never cascade-deleted, so attempting the delete would just throw a raw
  // FK constraint error (P2003). Returned (not thrown) so the specific
  // reason reaches the user instead of the generic error boundary.
  const [invoiceCount, requirementCount, approvalChain] = await Promise.all([
    prisma.invoice.count({ where: { companyId: id } }),
    prisma.complianceRequirement.count({ where: { companyId: id } }),
    prisma.approvalChain.findUnique({ where: { companyId: id } }),
  ]);

  if (invoiceCount > 0) {
    return {
      type: "error",
      message: `Cannot delete — ${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"} exist for this company. Remove or reassign them first.`,
    };
  }
  if (requirementCount > 0) {
    return {
      type: "error",
      message: `Cannot delete — ${requirementCount} compliance requirement${requirementCount === 1 ? "" : "s"} exist for this company. Remove them first.`,
    };
  }
  if (approvalChain) {
    return {
      type: "error",
      message: "Cannot delete — this company has a custom approval chain. Remove it first.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const sites = await tx.site.findMany({
        where: { companyId: id },
        select: { id: true },
      });
      const siteIds = sites.map((s) => s.id);

      // Delete timesheets linked to this company's assignments
      await tx.timesheet.deleteMany({
        where: { assignment: { companyId: id } },
      });

      // Delete assignments — contractors themselves are NOT deleted
      await tx.assignment.deleteMany({ where: { companyId: id } });

      // Delete departments and sites
      if (siteIds.length > 0) {
        await tx.department.deleteMany({ where: { siteId: { in: siteIds } } });
      }
      await tx.site.deleteMany({ where: { companyId: id } });

      await tx.company.delete({ where: { id } });
    });

    revalidatePath("/companies");
    redirect("/companies");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete company:", error);
    return { type: "error", message: "Failed to delete company. Please try again." };
  }
}

/**
 * Activates or deactivates a client.
 *
 * Deactivating closes the client's live assignments and then re-tests each
 * affected contractor: anyone left with no live work anywhere goes Inactive.
 * Without this, ending a client left its workers showing as Active with nothing
 * to do, inflating the assigned-workforce headcount and dragging the compliance
 * score down for people who are not actually placed.
 *
 * Contractors placed with more than one client are NOT deactivated — the shared
 * rule checks for other live work first.
 *
 * Reactivating deliberately does NOT reinstate contractors. Their assignments
 * were closed, so putting them back to work is a staffing decision, not a
 * side-effect of a toggle.
 */
export async function setCompanyActive(id: string, active: boolean) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  try {
    if (!active) {
      const live = await prisma.assignment.findMany({
        where: { companyId: id, status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
        select: { id: true, contractorId: true },
      });

      if (live.length > 0) {
        await prisma.assignment.updateMany({
          where: { id: { in: live.map((a) => a.id) } },
          data: { status: "Completed" },
        });
        await deactivateContractorsWithNoLiveWork(live.map((a) => a.contractorId));
      }
    }

    await prisma.company.update({ where: { id }, data: { isActive: active } });

    revalidatePath("/companies");
    revalidatePath(`/companies/${id}`);
    revalidatePath("/assignments");
    revalidatePath("/contractors");
    revalidatePath("/compliance");
    return { type: "success" as const };
  } catch (error) {
    console.error("Failed to change client status:", error);
    return {
      type: "error" as const,
      message: "Could not change the client's status. Please try again.",
    };
  }
}
