"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself while its form's server action is in
 * flight, so a slow action cannot be submitted twice by an impatient click.
 *
 * This matters most on invoice generation: the "already invoiced" check there
 * runs before the transaction opens, so two overlapping runs could each decide
 * the same timesheets were unbilled. A double-click is by far the likeliest way
 * to produce those two overlapping runs.
 *
 * Must live in its own client component — useFormStatus only reports the status
 * of a form in an ancestor, and the pages using it are server components.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel ?? "Working…" : children}
    </button>
  );
}
