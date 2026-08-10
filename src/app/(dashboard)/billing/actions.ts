"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

/**
 * Get next invoice number (INV-0001, INV-0002, etc.)
 *
 * Computes the max from ALL existing invoice numbers (parsed as integers),
 * not a lexicographic (string) sort — "INV-10000" sorts before "INV-9999"
 * alphabetically, which would return a stale/lower number past 4 digits.
 *
 * Accepts a transaction client so callers can run the read + the eventual
 * create inside the same `prisma.$transaction`, keeping the read atomic
 * with the write it feeds.
 */
async function getNextInvoiceNumber(
  tx: Prisma.TransactionClient | typeof prisma
): Promise<string> {
  const invoices = await tx.invoice.findMany({
    select: { invoiceNumber: true },
  });

  const maxNum = invoices.reduce((max, inv) => {
    const n = parseInt(inv.invoiceNumber.replace("INV-", ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `INV-${String(maxNum + 1).padStart(4, "0")}`;
}

/**
 * Thrown from inside generateInvoices' transaction when, after the
 * already-invoiced check runs (which must happen inside the transaction —
 * see the comment on `runBatch` below), nothing remains left to bill. Kept
 * distinct from Prisma's P2034/P2002 write-conflict codes so it can never be
 * mistaken for one and retried — it means the batch is legitimately empty,
 * not that it lost a race.
 */
class AlreadyInvoicedError extends Error {}

/**
 * Auto-generate invoices from approved timesheets for a given period
 */
export async function generateInvoices(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const periodStart = new Date(formData.get("periodStart") as string);
    const periodEnd = new Date(formData.get("periodEnd") as string);
    const companyId = (formData.get("companyId") as string) || null;
    const vatRate = parseFloat((formData.get("vatRate") as string) || "20");

    // Find approved timesheets in the period that haven't been invoiced yet
    const where: Record<string, unknown> = {
      status: "Approved",
      weekStarting: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    // Filter by company if specified (through assignment)
    if (companyId) {
      where.assignment = { companyId };
    }

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        contractor: true,
        assignment: { include: { company: true, site: true, department: true } },
        entries: {
          include: { assignment: { include: { company: true, site: true, department: true } } },
        },
      },
      orderBy: { weekStarting: "asc" },
    });

    // Find approved expenses in the same period/company scope as the timesheets
    // above (mirrors the timesheet where-clause: same date-range field on the
    // expense, same company scoping via the linked assignment).
    const expenseWhere: Record<string, unknown> = {
      status: "Approved",
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    };
    if (companyId) {
      expenseWhere.assignment = { companyId };
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        contractor: true,
        assignment: { include: { company: true } },
      },
      orderBy: { date: "asc" },
    });
    // Expenses without a linked assignment can't be scoped to a company, so
    // they're excluded from this run rather than guessed at.
    const scopedExpenses = expenses.filter((e) => e.assignment?.company);

    if (timesheets.length === 0 && scopedExpenses.length === 0) {
      redirect("/billing/generate?error=no-timesheets");
    }

    // Generate one invoice per company inside a single Serializable
    // transaction. The "already invoiced" check runs as READS INSIDE this
    // transaction (via `tx`, not `prisma`) — not before it opens.
    //
    // Two runs that each check "already invoiced?" outside a shared
    // transaction — two staff racing, or (the realistic case, given this
    // batch's size) one impatient double-click before the button disabled
    // itself — can both see the same timesheets as unbilled, because
    // neither run's read can see the other run's still-uncommitted writes.
    // Both then create InvoiceLine rows for the same timesheets: a silent
    // double invoice. Reading InvoiceLine here, inside the same Serializable
    // transaction that writes it, puts the check under Postgres's
    // snapshot-conflict detection: if two concurrent transactions both read
    // "not yet invoiced" for a row and both then write it, Postgres
    // recognises the write skew and aborts the loser with a serialization
    // failure (P2034), which the retry below recomputes and reruns rather
    // than surfacing a spurious failure to the user.
    //
    // This also means every invoice number is read and consumed atomically:
    // two companies in this same call, or two concurrent calls, can never be
    // handed the same number, and a failure partway through rolls the whole
    // batch back instead of leaving some companies invoiced and others not.
    const runBatch = () =>
      prisma.$transaction(
        async (tx) => {
          // Check which timesheets are already on an invoice
          const existingLines = await tx.invoiceLine.findMany({
            where: { timesheetId: { in: timesheets.map((t) => t.id) } },
            select: { timesheetId: true },
          });
          const invoicedTimesheetIds = new Set(existingLines.map((l) => l.timesheetId));

          // Filter out already-invoiced timesheets
          const uninvoicedTimesheets = timesheets.filter(
            (t) => !invoicedTimesheetIds.has(t.id)
          );

          // Check which expenses are already on an invoice
          const existingExpenseLines = await tx.invoiceLine.findMany({
            where: { expenseId: { in: scopedExpenses.map((e) => e.id) } },
            select: { expenseId: true },
          });
          const invoicedExpenseIds = new Set(existingExpenseLines.map((l) => l.expenseId));

          // Filter out already-invoiced expenses
          const uninvoicedExpenses = scopedExpenses.filter(
            (e) => !invoicedExpenseIds.has(e.id)
          );

          if (uninvoicedTimesheets.length === 0 && uninvoicedExpenses.length === 0) {
            // Thrown rather than redirect()ed — this can be reached on the
            // very first attempt (genuinely nothing left to bill) or after a
            // retry below discovers a concurrent run just claimed
            // everything. Either way it must reach the redirect in the
            // outer catch, not the P2034/P2002 retry, hence a distinct type.
            throw new AlreadyInvoicedError();
          }

          // Group timesheets and expenses by company
          const byCompany = new Map<
            string,
            {
              company: { id: string; name: string };
              timesheets: typeof uninvoicedTimesheets;
              expenses: typeof uninvoicedExpenses;
            }
          >();

          for (const ts of uninvoicedTimesheets) {
            // Fall back to the first entry carrying a resolved assignment when the
            // week-level assignment is missing (e.g. per-day assignments were set
            // but the week-level one never got synced). If entries span more than
            // one company this buckets to the first resolved one — genuinely
            // cross-company weeks are out of scope here.
            const company = ts.assignment?.company ?? ts.entries.find((e) => e.assignment?.company)?.assignment?.company;
            if (!company) continue;

            if (!byCompany.has(company.id)) {
              byCompany.set(company.id, { company, timesheets: [], expenses: [] });
            }
            byCompany.get(company.id)!.timesheets.push(ts);
          }

          for (const ex of uninvoicedExpenses) {
            const company = ex.assignment?.company;
            if (!company) continue;

            if (!byCompany.has(company.id)) {
              byCompany.set(company.id, { company, timesheets: [], expenses: [] });
            }
            byCompany.get(company.id)!.expenses.push(ex);
          }

          const ids: string[] = [];

          for (const [cId, { timesheets: companyTimesheets, expenses: companyExpenses }] of byCompany) {
            const invoiceNumber = await getNextInvoiceNumber(tx);

            // Calculate due date (30 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            // Get PO number from first assignment (if any)
            const poNumbers = [
              ...new Set(
                companyTimesheets
                  .map((t) => t.assignment?.poNumber)
                  .filter(Boolean)
              ),
            ];

            // Build invoice lines
            const lines: {
              contractorId: string;
              timesheetId?: string;
              expenseId?: string;
              description: string;
              hours: number;
              overtimeHours: number;
              rate: number;
              overtimeRate: number | null;
              amount: number;
            }[] = [];

            for (const ts of companyTimesheets) {
              const contractor = ts.contractor;

              // Group this timesheet's day entries by the assignment actually
              // worked that day (entry.assignmentId), falling back to the
              // timesheet-level assignmentId for any day that predates
              // per-day assignment tracking. Grouping by this resolved key —
              // rather than by entry.assignmentId directly — means a legacy
              // or single-assignment week (every entry.assignmentId is null)
              // always collapses to exactly one group keyed on
              // ts.assignmentId, which takes the identical branch below as
              // pre-split invoices.
              const groups = new Map<
                string,
                { assignment: typeof ts.assignment | null; entries: typeof ts.entries }
              >();
              for (const entry of ts.entries) {
                const key = entry.assignmentId ?? ts.assignmentId ?? "__none__";
                const groupAssignment = entry.assignment ?? ts.assignment ?? null;
                const existingGroup = groups.get(key);
                if (existingGroup) {
                  existingGroup.entries.push(entry);
                } else {
                  groups.set(key, { assignment: groupAssignment, entries: [entry] });
                }
              }
              const groupList = [...groups.values()];

              if (groupList.length <= 1) {
                // Regression-safe path: 0 or 1 resolved assignment for the
                // whole week — this MUST produce exactly the same numbers as
                // the pre-split logic (same source fields, same formula).
                // chargeRate is hourly (see schema). dayRate is per-day and must
                // NOT be used against hours — if no hourly charge rate is set,
                // bill 0 and flag the line so it gets fixed before the invoice
                // is sent. Prefer the assignment's own negotiated charge rate
                // (set per-placement on the Assignment record) over the
                // contractor's default rate card; only flag the line when
                // neither is available.
                const soleAssignment = groupList[0]?.assignment ?? ts.assignment ?? null;
                const chargeRate = soleAssignment?.chargeRate ?? contractor.chargeRate ?? 0;
                const missingChargeRate = !soleAssignment?.chargeRate && !contractor.chargeRate;
                const overtimeRate = chargeRate * 1.5;
                const regularHours = ts.totalHours - ts.overtimeHours;
                const amount = regularHours * chargeRate + ts.overtimeHours * overtimeRate;

                lines.push({
                  contractorId: contractor.id,
                  timesheetId: ts.id,
                  description: `${contractor.firstName.charAt(0)}. ${contractor.lastName} - ${soleAssignment?.role || contractor.jobTitle || "Contractor"}${missingChargeRate ? " [NO CHARGE RATE SET]" : ""}`,
                  hours: regularHours,
                  overtimeHours: ts.overtimeHours,
                  rate: chargeRate,
                  overtimeRate,
                  amount: Math.round(amount * 100) / 100,
                });
              } else {
                // Multiple assignments worked within the same week — split
                // into one invoice line per assignment, each priced at that
                // assignment's own charge rate (falling back to the
                // contractor's default), using the per-day hours/overtime
                // actually recorded against that assignment.
                for (const group of groupList) {
                  const groupHours = group.entries.reduce((sum, e) => sum + e.hours, 0);
                  const groupOvertime = group.entries.reduce((sum, e) => sum + e.overtime, 0);
                  const regularHours = groupHours - groupOvertime;
                  if (regularHours <= 0 && groupOvertime <= 0) continue; // nothing billable in this split (e.g. absence-only)

                  const chargeRate = group.assignment?.chargeRate ?? contractor.chargeRate ?? 0;
                  const missingChargeRate = !group.assignment?.chargeRate && !contractor.chargeRate;
                  const overtimeRate = chargeRate * 1.5;
                  const amount = regularHours * chargeRate + groupOvertime * overtimeRate;

                  const siteDeptParts = [group.assignment?.site?.name, group.assignment?.department?.name].filter(
                    (v): v is string => Boolean(v)
                  );
                  const siteDeptLabel =
                    siteDeptParts.length > 0
                      ? siteDeptParts.join(" / ")
                      : group.assignment?.role || contractor.jobTitle || "Contractor";

                  lines.push({
                    contractorId: contractor.id,
                    timesheetId: ts.id,
                    description: `${contractor.firstName.charAt(0)}. ${contractor.lastName} - w/c ${formatDate(ts.weekStarting)} - ${siteDeptLabel}${missingChargeRate ? " [NO CHARGE RATE SET]" : ""}`,
                    hours: regularHours,
                    overtimeHours: groupOvertime,
                    rate: chargeRate,
                    overtimeRate,
                    amount: Math.round(amount * 100) / 100,
                  });
                }
              }
            }

            // Roll approved expenses into the invoice as their own lines —
            // one line per expense, billed at cost (no markup applied here).
            for (const ex of companyExpenses) {
              lines.push({
                contractorId: ex.contractorId,
                expenseId: ex.id,
                description: `${ex.category} - ${ex.description}`,
                hours: 0,
                overtimeHours: 0,
                rate: ex.amount,
                overtimeRate: null,
                amount: ex.amount,
              });
            }

            const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
            const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
            const total = Math.round((subtotal + vatAmount) * 100) / 100;

            // Determine match status based on PO
            const matchStatus = poNumbers.length > 0 ? "Partial" : "Unmatched";

            const invoice = await tx.invoice.create({
              data: {
                invoiceNumber,
                companyId: cId,
                periodStart,
                periodEnd,
                vatRate,
                subtotal,
                vatAmount,
                total,
                dueDate,
                poNumber: poNumbers.join(", ") || null,
                matchStatus,
                lines: {
                  create: lines,
                },
              },
            });

            // Flip the included expenses to "Invoiced" now that they're on
            // this invoice, so they don't get pulled into a future run.
            if (companyExpenses.length > 0) {
              await tx.expense.updateMany({
                where: { id: { in: companyExpenses.map((e) => e.id) } },
                data: { status: "Invoiced" },
              });
            }

            ids.push(invoice.id);
          }

          return ids;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

    // A Serializable transaction can abort with a write-conflict error
    // (P2034) if another invoice batch commits in the same window — retry
    // once with a freshly recomputed invoice number rather than surfacing a
    // spurious failure to the user.
    let invoiceIds: string[];
    try {
      invoiceIds = await runBatch();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2034" || code === "P2002") {
        invoiceIds = await runBatch();
      } else {
        throw error;
      }
    }

    revalidatePath("/billing");
    revalidatePath("/expenses");
    if (invoiceIds.length === 1) {
      redirect(`/billing/${invoiceIds[0]}`);
    }
    redirect("/billing");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    if (error instanceof AlreadyInvoicedError) {
      redirect("/billing/generate?error=already-invoiced");
    }
    console.error("Failed to generate invoices:", error);
    throw new Error("Failed to generate invoices. Please try again.");
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const data: Record<string, unknown> = { status };

    if (status === "Paid") {
      data.paidDate = new Date();
    }

    // Update match status when approved
    if (status === "Approved") {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (invoice?.poNumber && invoice.lines.every((l) => l.timesheetId)) {
        data.matchStatus = "Matched"; // PO + timesheets + invoice = 3-way match
      }
    }

    await prisma.invoice.update({ where: { id }, data });
    revalidatePath(`/billing/${id}`);
    revalidatePath("/billing");
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    throw new Error("Failed to update invoice status. Please try again.");
  }
}

/**
 * Delete a draft invoice
 */
export async function deleteInvoice(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.invoice.delete({ where: { id } });
    revalidatePath("/billing");
    redirect("/billing");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete invoice:", error);
    throw new Error("Failed to delete invoice. Please try again.");
  }
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceSent(id: string) {
  return updateInvoiceStatus(id, "Sent");
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(id: string) {
  return updateInvoiceStatus(id, "Paid");
}

/**
 * Approve invoice (triggers three-way match check)
 */
export async function approveInvoice(id: string) {
  return updateInvoiceStatus(id, "Approved");
}

// ─── Credit Notes ───

/**
 * Get next credit note number (CN-0001, CN-0002, etc.)
 * Same max-parse pattern as getNextInvoiceNumber — a lexicographic sort on
 * the string would break past 4 digits ("CN-10000" < "CN-9999").
 */
async function getNextCreditNoteNumber(
  tx: Prisma.TransactionClient | typeof prisma
): Promise<string> {
  const creditNotes = await tx.creditNote.findMany({
    select: { creditNoteNumber: true },
  });

  const maxNum = creditNotes.reduce((max, cn) => {
    const n = parseInt(cn.creditNoteNumber.replace("CN-", ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `CN-${String(maxNum + 1).padStart(4, "0")}`;
}

/**
 * Create a credit note against an invoice. Starts life as "Draft" and must
 * be moved through Issued → Processed via the dedicated actions below.
 */
export async function createCreditNote(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoiceId = (formData.get("invoiceId") as string) || "";
  const amount = parseFloat((formData.get("amount") as string) || "");
  const vatRate = parseFloat((formData.get("vatRate") as string) || "20");
  const reason = ((formData.get("reason") as string) || "").trim();
  const assignmentId = (formData.get("assignmentId") as string) || null;

  if (!invoiceId) redirect("/billing/credit-notes");
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/billing/credit-notes/new?invoiceId=${invoiceId}&error=invalid-amount`);
  }
  if (!reason) {
    redirect(`/billing/credit-notes/new?invoiceId=${invoiceId}&error=missing-reason`);
  }

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) redirect("/billing/credit-notes?error=invoice-not-found");

    const vatAmount = Math.round(amount * (vatRate / 100) * 100) / 100;
    const total = Math.round((amount + vatAmount) * 100) / 100;

    const runCreate = () =>
      prisma.$transaction(
        async (tx) => {
          const creditNoteNumber = await getNextCreditNoteNumber(tx);
          return tx.creditNote.create({
            data: {
              creditNoteNumber,
              invoiceId,
              companyId: invoice.companyId,
              assignmentId: assignmentId || null,
              amount,
              vatRate,
              vatAmount,
              total,
              reason,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

    // Same write-conflict retry as invoice generation: a Serializable
    // transaction can abort with P2034 if another credit note is created in
    // the same window, or P2002 if the parsed-max number collides.
    let creditNote;
    try {
      creditNote = await runCreate();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2034" || code === "P2002") {
        creditNote = await runCreate();
      } else {
        throw error;
      }
    }

    revalidatePath(`/billing/${invoiceId}`);
    revalidatePath("/billing/credit-notes");
    redirect(`/billing/credit-notes/${creditNote.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create credit note:", error);
    redirect(`/billing/credit-notes/new?invoiceId=${invoiceId}&error=create-failed`);
  }
}

/**
 * Draft → Issued
 */
export async function issueCreditNote(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const creditNote = await prisma.creditNote.findUnique({ where: { id } });
    if (!creditNote) throw new Error("Credit note not found.");
    if (creditNote.status !== "Draft") {
      throw new Error(`Cannot issue a credit note with status "${creditNote.status}".`);
    }

    await prisma.creditNote.update({ where: { id }, data: { status: "Issued" } });

    revalidatePath(`/billing/credit-notes/${id}`);
    revalidatePath("/billing/credit-notes");
    revalidatePath(`/billing/${creditNote.invoiceId}`);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Credit note not found." || error.message.startsWith("Cannot issue"))
    )
      throw error;
    console.error("Failed to issue credit note:", error);
    throw new Error("Failed to issue credit note. Please try again.");
  }
}

/**
 * Issued → Processed (mirrors Requidex's "Mark Processed" action)
 */
export async function markCreditNoteProcessed(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const creditNote = await prisma.creditNote.findUnique({ where: { id } });
    if (!creditNote) throw new Error("Credit note not found.");
    if (creditNote.status !== "Issued") {
      throw new Error(`Cannot mark a credit note with status "${creditNote.status}" as processed.`);
    }

    await prisma.creditNote.update({
      where: { id },
      data: {
        status: "Processed",
        processedAt: new Date(),
        processedBy: session.user.email || session.user.name || "staff",
      },
    });

    revalidatePath(`/billing/credit-notes/${id}`);
    revalidatePath("/billing/credit-notes");
    revalidatePath(`/billing/${creditNote.invoiceId}`);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Credit note not found." || error.message.startsWith("Cannot mark"))
    )
      throw error;
    console.error("Failed to mark credit note processed:", error);
    throw new Error("Failed to mark credit note as processed. Please try again.");
  }
}

// ─── Payments ───

/**
 * Recompute amountPaid (always derived — never stored) for an invoice and
 * flip its status accordingly:
 *  - amountPaid >= total  → "Paid" (+ paidDate), unless already Paid
 *  - amountPaid < total and status is currently "Paid" → revert to "Sent"
 *    (the state that precedes Paid in the normal lifecycle)
 * Called from the same transaction that records or deletes a payment so the
 * status transition is never out of sync with the underlying payment rows.
 */
async function applyPaymentRecalc(
  tx: Prisma.TransactionClient | typeof prisma,
  invoiceId: string
): Promise<void> {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return;

  const amountPaid = Math.round(invoice.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

  if (amountPaid >= invoice.total && invoice.status !== "Paid") {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "Paid", paidDate: new Date() },
    });
  } else if (amountPaid < invoice.total && invoice.status === "Paid") {
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "Sent", paidDate: null },
    });
  }
}

/**
 * Record a payment against an invoice. amountPaid is never stored directly —
 * it's re-derived from the sum of InvoicePayment rows every time.
 */
export async function recordPayment(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoiceId = (formData.get("invoiceId") as string) || "";
  const amount = parseFloat((formData.get("amount") as string) || "");
  const receivedDateRaw = (formData.get("receivedDate") as string) || "";
  const method = (formData.get("method") as string) || "BACS";
  const reference = ((formData.get("reference") as string) || "").trim() || null;
  const receivedDate = receivedDateRaw ? new Date(receivedDateRaw) : null;

  if (!invoiceId) redirect("/billing");
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/billing/${invoiceId}?error=invalid-amount`);
  }
  if (!receivedDate || Number.isNaN(receivedDate.getTime())) {
    redirect(`/billing/${invoiceId}?error=invalid-date`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.create({
        data: {
          invoiceId,
          amount,
          receivedDate: receivedDate as Date,
          method,
          reference,
        },
      });
      await applyPaymentRecalc(tx, invoiceId);
    });

    revalidatePath(`/billing/${invoiceId}`);
    revalidatePath("/billing");
    revalidatePath("/billing/aged");
  } catch (error) {
    console.error("Failed to record payment:", error);
    redirect(`/billing/${invoiceId}?error=payment-failed`);
  }
}

/**
 * Delete a payment (staff only — dashboard routes are already staff-gated
 * by middleware). Re-derives amountPaid afterwards and reverts a "Paid"
 * invoice back to "Sent" if the balance drops below total.
 */
export async function deletePayment(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const payment = await prisma.invoicePayment.findUnique({ where: { id } });
    if (!payment) throw new Error("Payment not found.");
    const invoiceId = payment.invoiceId;

    await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.delete({ where: { id } });
      await applyPaymentRecalc(tx, invoiceId);
    });

    revalidatePath(`/billing/${invoiceId}`);
    revalidatePath("/billing");
    revalidatePath("/billing/aged");
  } catch (error) {
    if (error instanceof Error && error.message === "Payment not found.") throw error;
    console.error("Failed to delete payment:", error);
    throw new Error("Failed to delete payment. Please try again.");
  }
}

// ─── Payments Import (CSV) ───

interface ParsedPaymentRow {
  reference: string;
  amount: number;
  date: Date;
}

const REFERENCE_HEADERS = ["reference", "invoicenumber", "invoiceno", "invoiceref", "ref", "invoice"];
const AMOUNT_HEADERS = ["amount", "value", "paymentamount"];
const DATE_HEADERS = ["date", "receiveddate", "paymentdate", "datepaid"];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Minimal quoted-field CSV line splitter — handles `"a,b",c` style cells. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function parsePaymentsCsv(text: string): { rows: ParsedPaymentRow[]; malformed: string[] } {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(splitCsvLine);

  const rows: ParsedPaymentRow[] = [];
  const malformed: string[] = [];
  if (lines.length === 0) return { rows, malformed };

  const header = lines[0].map(normalizeHeader);
  const refIdx = header.findIndex((h) => REFERENCE_HEADERS.includes(h));
  const amountIdx = header.findIndex((h) => AMOUNT_HEADERS.includes(h));
  const dateIdx = header.findIndex((h) => DATE_HEADERS.includes(h));
  const hasHeader = refIdx !== -1 && amountIdx !== -1 && dateIdx !== -1;

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rIdx = hasHeader ? refIdx : 0;
  const aIdx = hasHeader ? amountIdx : 1;
  const dIdx = hasHeader ? dateIdx : 2;

  for (const cells of dataLines) {
    const reference = (cells[rIdx] || "").trim();
    const amountStr = (cells[aIdx] || "").replace(/[£,]/g, "").trim();
    const dateStr = (cells[dIdx] || "").trim();
    const amount = parseFloat(amountStr);
    const date = dateStr ? new Date(dateStr) : null;

    if (!reference || !Number.isFinite(amount) || amount <= 0 || !date || Number.isNaN(date.getTime())) {
      malformed.push(cells.join(","));
      continue;
    }
    rows.push({ reference, amount, date });
  }

  return { rows, malformed };
}

export interface PaymentsImportPreviewRow {
  reference: string;
  amount: number;
  date: string; // ISO
  status: "matched" | "already-paid" | "unmatched";
  invoiceId?: string;
  invoiceTotal?: number;
  invoiceStatus?: string;
}

export interface PaymentsImportPreview {
  rows: PaymentsImportPreviewRow[];
  malformed: string[];
  matchedCount: number;
  alreadyPaidCount: number;
  unmatchedCount: number;
}

/**
 * Parse + match a pasted/uploaded CSV against invoices by invoiceNumber.
 * Read-only — writes nothing. Unmatched rows are always reported, never
 * silently dropped.
 */
export async function previewPaymentsImport(csvText: string): Promise<PaymentsImportPreview> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { rows, malformed } = parsePaymentsCsv(csvText);
  const references = [...new Set(rows.map((r) => r.reference))];

  const invoices = await prisma.invoice.findMany({
    where: { invoiceNumber: { in: references } },
    include: { payments: true },
  });
  const byNumber = new Map(invoices.map((inv) => [inv.invoiceNumber, inv]));

  const previewRows: PaymentsImportPreviewRow[] = rows.map((r) => {
    const invoice = byNumber.get(r.reference);
    if (!invoice) {
      return { reference: r.reference, amount: r.amount, date: r.date.toISOString(), status: "unmatched" };
    }
    const amountPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const status: PaymentsImportPreviewRow["status"] =
      invoice.status === "Paid" || amountPaid >= invoice.total ? "already-paid" : "matched";
    return {
      reference: r.reference,
      amount: r.amount,
      date: r.date.toISOString(),
      status,
      invoiceId: invoice.id,
      invoiceTotal: invoice.total,
      invoiceStatus: invoice.status,
    };
  });

  return {
    rows: previewRows,
    malformed,
    matchedCount: previewRows.filter((r) => r.status === "matched").length,
    alreadyPaidCount: previewRows.filter((r) => r.status === "already-paid").length,
    unmatchedCount: previewRows.filter((r) => r.status === "unmatched").length,
  };
}

export interface PaymentsImportResult {
  imported: number;
  skippedUnmatched: number;
  skippedMalformed: number;
  skippedAlreadyPaid: number;
  skippedDuplicate: number;
  importBatch: string;
}

/** Fingerprint used to detect a payment already recorded — same invoice,
 * amount (to the penny), received date (day-level), and reference. */
function paymentFingerprint(invoiceId: string, amount: number, receivedDate: Date, reference: string): string {
  const amountCents = Math.round(amount * 100);
  return `${invoiceId}|${amountCents}|${receivedDate.toISOString().slice(0, 10)}|${reference}`;
}

/**
 * Re-parses the same CSV and commits matched (+ already-paid) rows as
 * InvoicePayment records in one Serializable transaction, retrying once on
 * a write conflict — the multi-row write path the house style calls for.
 * Unmatched rows are counted and reported, never silently dropped.
 *
 * Double-import protection: a row is skipped (not re-applied) when its
 * target invoice is already fully paid, or when an identical InvoicePayment
 * (same invoice + amount + received date + reference) already exists —
 * either from a prior confirm or from an earlier row in this same run.
 */
export async function confirmPaymentsImport(csvText: string): Promise<PaymentsImportResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { rows, malformed } = parsePaymentsCsv(csvText);
  const references = [...new Set(rows.map((r) => r.reference))];
  const importBatch = `imp-${Date.now()}`;

  const runImport = () =>
    prisma.$transaction(
      async (tx) => {
        const invoices = await tx.invoice.findMany({
          where: { invoiceNumber: { in: references } },
          include: { payments: true },
        });
        const byNumber = new Map(invoices.map((inv) => [inv.invoiceNumber, inv]));

        // Running amountPaid per invoice, updated as rows in this batch are applied.
        const amountPaidByInvoice = new Map(
          invoices.map((inv) => [inv.id, inv.payments.reduce((sum, p) => sum + p.amount, 0)])
        );
        // Existing payment fingerprints, seeded from the DB and grown as this
        // batch applies rows — catches duplicates both against history and
        // against other rows earlier in the same CSV.
        const seenFingerprints = new Set(
          invoices.flatMap((inv) =>
            inv.payments.map((p) => paymentFingerprint(inv.id, p.amount, p.receivedDate, p.reference ?? ""))
          )
        );

        let imported = 0;
        let skippedUnmatched = 0;
        let skippedAlreadyPaid = 0;
        let skippedDuplicate = 0;
        const touchedInvoiceIds = new Set<string>();

        for (const row of rows) {
          const invoice = byNumber.get(row.reference);
          if (!invoice) {
            skippedUnmatched++;
            continue;
          }

          const currentAmountPaid = amountPaidByInvoice.get(invoice.id) ?? 0;
          if (currentAmountPaid >= invoice.total) {
            skippedAlreadyPaid++;
            continue;
          }

          const fingerprint = paymentFingerprint(invoice.id, row.amount, row.date, row.reference);
          if (seenFingerprints.has(fingerprint)) {
            skippedDuplicate++;
            continue;
          }

          await tx.invoicePayment.create({
            data: {
              invoiceId: invoice.id,
              amount: row.amount,
              receivedDate: row.date,
              method: "BACS",
              reference: row.reference,
              importBatch,
            },
          });
          seenFingerprints.add(fingerprint);
          amountPaidByInvoice.set(invoice.id, currentAmountPaid + row.amount);
          touchedInvoiceIds.add(invoice.id);
          imported++;
        }

        for (const invoiceId of touchedInvoiceIds) {
          await applyPaymentRecalc(tx, invoiceId);
        }

        return { imported, skippedUnmatched, skippedAlreadyPaid, skippedDuplicate };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  let result: { imported: number; skippedUnmatched: number; skippedAlreadyPaid: number; skippedDuplicate: number };
  try {
    result = await runImport();
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2034" || code === "P2002") {
      result = await runImport();
    } else {
      console.error("Failed to import payments:", error);
      throw new Error("Failed to import payments. Please try again.");
    }
  }

  revalidatePath("/billing");
  revalidatePath("/billing/aged");

  return {
    imported: result.imported,
    skippedUnmatched: result.skippedUnmatched,
    skippedMalformed: malformed.length,
    skippedAlreadyPaid: result.skippedAlreadyPaid,
    skippedDuplicate: result.skippedDuplicate,
    importBatch,
  };
}
