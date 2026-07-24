export interface PayQueryHourRow {
  date: string;
  start: string;
  finish: string;
  hoursClaimed: string;
  hoursPaid: string;
}

export interface CreatePayQueryInput {
  queryType: string;
  weekEnding: string;
  totalHoursClaimed: string;
  totalOvertimeClaimed: string;
  totalHoursPaid: string;
  hours: PayQueryHourRow[];
  explanation: string;
  signature: string;
}

export interface TimesheetEntryOption {
  dayOfWeek: number;
  hours: number;
  startTime: string | null;
  finishTime: string | null;
  status: string;
}

export interface TimesheetOption {
  id: string;
  weekStarting: string;
  totalHours: number;
  overtimeHours: number;
  entries: TimesheetEntryOption[];
}
