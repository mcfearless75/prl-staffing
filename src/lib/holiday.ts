import { prisma } from "@/lib/db";

/**
 * Holiday accrual engine — PAYE contractors only.
 *
 * accruedHours = 12.07% x sum(totalHours + overtimeHours) of Approved timesheets.
 * balance      = accruedHours + sum(HolidayLedger Adjustment hours) - sum(HolidayLedger Payment hours).
 *
 * No accrual rows are ever written to HolidayLedger — accrual is always derived
 * on read. HolidayLedger only ever contains Payment / Adjustment rows.
 */

export const HOLIDAY_ACCRUAL_RATE = 0.1207;

export interface HolidayBalance {
  contractorId: string;
  contractorName: string;
  contractorRef: string | null;
  accruedHours: number;
  paidHours: number;
  adjustmentHours: number;
  balanceHours: number;
}

export function isPayeContractor(employmentType: string | null | undefined): boolean {
  return employmentType === "PAYE";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Balances for every PAYE contractor. */
export async function computeHolidayBalances(): Promise<HolidayBalance[]> {
  const contractors = await prisma.contractor.findMany({
    where: { employmentType: "PAYE" },
    include: {
      timesheets: {
        where: { status: "Approved" },
        select: { totalHours: true, overtimeHours: true },
      },
      holidayLedger: { select: { type: true, hours: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return contractors.map((c) => toBalance(c.id, `${c.firstName} ${c.lastName}`, c.ref, c.timesheets, c.holidayLedger));
}

/** Balance for a single contractor (returns null if not a PAYE contractor). */
export async function computeHolidayBalanceForContractor(contractorId: string): Promise<HolidayBalance | null> {
  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    include: {
      timesheets: {
        where: { status: "Approved" },
        select: { totalHours: true, overtimeHours: true },
      },
      holidayLedger: { select: { type: true, hours: true } },
    },
  });

  if (!c || !isPayeContractor(c.employmentType)) return null;

  return toBalance(c.id, `${c.firstName} ${c.lastName}`, c.ref, c.timesheets, c.holidayLedger);
}

function toBalance(
  contractorId: string,
  contractorName: string,
  contractorRef: string | null,
  timesheets: { totalHours: number; overtimeHours: number }[],
  ledger: { type: string; hours: number }[]
): HolidayBalance {
  const approvedHours = timesheets.reduce((sum, t) => sum + t.totalHours + t.overtimeHours, 0);
  const accruedHours = approvedHours * HOLIDAY_ACCRUAL_RATE;
  const paidHours = ledger.filter((l) => l.type === "Payment").reduce((s, l) => s + l.hours, 0);
  const adjustmentHours = ledger.filter((l) => l.type === "Adjustment").reduce((s, l) => s + l.hours, 0);
  const balanceHours = accruedHours + adjustmentHours - paidHours;

  return {
    contractorId,
    contractorName,
    contractorRef,
    accruedHours: round2(accruedHours),
    paidHours: round2(paidHours),
    adjustmentHours: round2(adjustmentHours),
    balanceHours: round2(balanceHours),
  };
}
