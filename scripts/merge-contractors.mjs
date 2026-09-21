/**
 * Merges two subcontractor records that are the same person.
 *
 *   # show what would happen, change nothing (the default):
 *   railway run --service Postgres node scripts/merge-contractors.mjs --keep C00327 --merge C00045
 *
 *   # actually do it:
 *   railway run --service Postgres node scripts/merge-contractors.mjs --keep C00327 --merge C00045 --execute
 *
 * Companion to scripts/find-duplicate-contractors.mjs, which finds the pairs.
 * This one acts on a pair you have already decided about — it deliberately does
 * NOT decide for you, because "same NI number" can equally mean one person
 * recorded twice or two people where somebody's NI was typed onto the wrong
 * record, and only a human can tell those apart.
 *
 * WHY THIS IS NOT A ONE-LINE UPDATE
 *
 * Fifteen tables hang off Contractor, including pay history: timesheets,
 * invoice lines, holiday ledger, compliance records. Every one has to be
 * repointed before the losing row can go, and two of them reject a naive
 * repoint outright:
 *
 *   - ContractorLogin has @unique on BOTH contractorId and email, so if both
 *     records have a portal account you cannot simply move one across.
 *   - ContractorJobRole has @@unique([contractorId, jobRoleId]), so moving a
 *     role the keeper already holds violates the constraint.
 *
 * Both are detected and reported before anything is written.
 *
 * SAFETY
 *   - Dry run unless --execute is passed. The dry run opens no transaction.
 *   - --execute wraps everything in one transaction: all of it lands or none.
 *   - The losing record is serialised into the keeper's notes before deletion,
 *     so the merge is auditable and nothing is silently destroyed.
 *   - Blank fields on the keeper are filled from the loser. Populated fields
 *     are NEVER overwritten — a merge must not quietly change someone's NI
 *     number or pay rate. Differing values are reported for a human instead.
 *
 * PII: prints names, emails and masked NI. Do not paste output anywhere public.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("\n  Run via: railway run --service Postgres node scripts/merge-contractors.mjs ...\n");
  process.exit(2);
}

/* ------------------------------ arguments ------------------------------ */

function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const keepKey = arg("keep");
const mergeKey = arg("merge");
const execute = process.argv.includes("--execute");

if (!keepKey || !mergeKey) {
  console.error(
    "\n  Usage: --keep <ref|id> --merge <ref|id> [--execute]\n" +
      "  e.g.   --keep C00327 --merge C00045\n"
  );
  process.exit(2);
}

const prisma = new PrismaClient();

/**
 * Every table holding a contractorId, as [prismaModel, humanLabel].
 *
 * Derived from a grep of schema.prisma for `contractorId`. If a new relation is
 * added to Contractor it MUST be added here, or a merge will orphan its rows.
 * The guard in main() fails loudly on a name that is not a real Prisma model,
 * but it cannot know about a table nobody listed.
 *
 * ContractorLogin and ContractorJobRole are absent on purpose — both carry
 * unique constraints and are handled separately below.
 */
const RELATIONS = [
  ["assignment", "assignments"],
  ["timesheet", "timesheets"],
  ["complianceRecord", "compliance records"],
  ["invoiceLine", "invoice lines"],
  ["document", "documents"],
  ["expense", "expenses"],
  ["contractorNote", "notes"],
  ["holidayLedger", "holiday ledger entries"],
  ["holidayRequest", "holiday requests"],
  ["chaseLog", "chase logs"],
  ["consentRecord", "consent records"],
  ["erasureRequest", "erasure requests"],
  ["newStarterSubmission", "new-starter submissions"],
  ["pushSubscription", "push subscriptions"],
  ["callEnquiry", "call enquiries"],
];

/**
 * Fields that may be copied across when the keeper's copy is blank.
 *
 * Absence from this list is a decision, not an oversight: email, ref, status,
 * approvedAt, inviteToken and the bounce columns identify the surviving record
 * and must stay as they are.
 */
const FILLABLE = [
  "phone", "personalEmail", "jobTitle", "niNumber", "utrNumber", "ir35Status",
  "employmentType", "dateOfBirth", "address", "postcode", "nextOfKin",
  "medicalNotes", "emergencyContactName", "emergencyContactPhone",
  "emergencyContactRelation", "nonBritishNational", "requiresWorkPermit",
  "passportNumber", "passportExpiry", "visaNumber", "visaExpiry",
  "dayRate", "payRate", "chargeRate", "supplierId", "latitude", "longitude",
];

/** Last three characters only — enough to tell two records apart, not to use. */
function maskNi(ni) {
  if (!ni) return "—";
  const v = String(ni).trim();
  return v.length <= 3 ? "***" : "*".repeat(v.length - 3) + v.slice(-3);
}

const isBlank = (v) => v === null || v === undefined || v === "";
const show = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);

async function findContractor(key) {
  return prisma.contractor.findFirst({
    where: { OR: [{ id: key }, { ref: key }] },
    include: { contractorLogin: true, jobRoles: true },
  });
}

async function main() {
  for (const [model] of RELATIONS) {
    if (!prisma[model]) {
      throw new Error('No Prisma model "' + model + '" — RELATIONS is out of date with the schema.');
    }
  }

  const keep = await findContractor(keepKey);
  const loser = await findContractor(mergeKey);
  if (!keep) throw new Error('No contractor matching --keep "' + keepKey + '"');
  if (!loser) throw new Error('No contractor matching --merge "' + mergeKey + '"');
  // Checked on resolved ids, not on the arguments: --keep C00045 --merge <its cuid>
  // are different strings naming one record, and merging it into itself would
  // delete it along with everything attached.
  if (keep.id === loser.id) throw new Error("Both arguments resolved to the same record.");

  const banner = execute ? "EXECUTING — this will write" : "DRY RUN — nothing will be written";
  console.log("\n" + "=".repeat(74) + "\n  " + banner + "\n" + "=".repeat(74) + "\n");

  const card = (label, c) =>
    console.log(
      "  " + label + "\n" +
        "    " + (c.ref || "(no ref)") + "  " + c.firstName + " " + c.lastName + "\n" +
        "    email   " + c.email + "\n" +
        "    NI      " + maskNi(c.niNumber) + "\n" +
        "    status  " + c.status + "\n" +
        "    login   " + (c.contractorLogin
          ? "yes (last login " + (c.contractorLogin.lastLoginAt?.toISOString().slice(0, 10) || "never") + ")"
          : "no") + "\n" +
        "    added   " + c.createdAt.toISOString().slice(0, 10) + "\n"
    );
  card("KEEP  ", keep);
  card("MERGE ", loser);

  /* -------------------------- rows to repoint -------------------------- */

  console.log(
    "-".repeat(74) + "\n  Rows moving from " + (loser.ref || loser.id) +
      " to " + (keep.ref || keep.id) + "\n" + "-".repeat(74)
  );
  let total = 0;
  const counts = [];
  for (const [model, label] of RELATIONS) {
    const n = await prisma[model].count({ where: { contractorId: loser.id } });
    if (n > 0) {
      counts.push([model, label, n]);
      total += n;
      console.log("    " + String(n).padStart(5) + "  " + label);
    }
  }
  if (total === 0) console.log("    (none — the losing record has no attached data)");

  /* ---------------------------- collisions ----------------------------- */

  console.log("\n" + "-".repeat(74) + "\n  Constraint handling\n" + "-".repeat(74));

  let loginPlan = "neither record has a portal account — nothing to do";
  if (loser.contractorLogin && keep.contractorLogin) {
    loginPlan =
      "BOTH have one. Keeping the keeper's and DELETING the login for " +
      loser.email + " — that password stops working.";
  } else if (loser.contractorLogin) {
    loginPlan =
      "only the losing record has one — moving it across and re-pointing it at " +
      keep.email + ", so the surviving record owns it.";
  } else if (keep.contractorLogin) {
    loginPlan = "only the keeper has one — left untouched";
  }
  console.log("    ContractorLogin:    " + loginPlan);

  const keepRoleIds = new Set(keep.jobRoles.map((r) => r.jobRoleId));
  const movingRoles = loser.jobRoles.filter((r) => !keepRoleIds.has(r.jobRoleId));
  const collidingRoles = loser.jobRoles.length - movingRoles.length;
  console.log(
    "    ContractorJobRole:  " + movingRoles.length + " role link(s) move, " +
      collidingRoles + " dropped because the keeper already holds them"
  );

  /* ---------------------------- field fill ----------------------------- */

  const fills = FILLABLE.filter((f) => isBlank(keep[f]) && !isBlank(loser[f]));
  console.log(
    "\n" + "-".repeat(74) + "\n  Blank fields on the keeper, filled from the losing record\n" + "-".repeat(74)
  );
  if (fills.length === 0) console.log("    (none)");
  for (const f of fills) {
    console.log("    " + f.padEnd(26) + " <- " + (f === "niNumber" ? maskNi(loser[f]) : show(loser[f])));
  }

  const conflicts = FILLABLE.filter(
    (f) => !isBlank(keep[f]) && !isBlank(loser[f]) && String(keep[f]) !== String(loser[f])
  );
  if (conflicts.length) {
    console.log("\n  Set on BOTH and DIFFERENT. The keeper's value wins; the loser's survives");
    console.log("  only in the archived snapshot. Check these by hand:");
    for (const f of conflicts) {
      const m = (x) => (f === "niNumber" ? maskNi(x) : show(x));
      console.log("    " + f.padEnd(26) + " keep=" + m(keep[f]) + "   merge=" + m(loser[f]));
    }
  }

  /* ------------------------------- finish ------------------------------- */

  if (!execute) {
    console.log(
      "\n" + "=".repeat(74) + "\n" +
        "  DRY RUN — nothing was written.\n" +
        "  " + total + " row(s) would move, and " + (loser.ref || loser.id) +
        " would be DELETED after\n" +
        "  being archived into the keeper's notes.\n\n" +
        "  Re-run the same command with --execute to apply.\n" + "=".repeat(74) + "\n"
    );
    return;
  }

  // Taken before the transaction: afterwards the losing row is gone and this is
  // the only surviving record of what it held.
  const snapshot = JSON.stringify(
    { mergedAt: new Date().toISOString(), mergedFrom: { ...loser, contractorLogin: undefined } },
    null,
    1
  );

  await prisma.$transaction(async (tx) => {
    for (const [model] of counts) {
      await tx[model].updateMany({
        where: { contractorId: loser.id },
        data: { contractorId: keep.id },
      });
    }

    // Roles: move what fits, then clear whatever is left so the delete below
    // is not blocked by the remaining links.
    for (const r of movingRoles) {
      await tx.contractorJobRole.update({ where: { id: r.id }, data: { contractorId: keep.id } });
    }
    await tx.contractorJobRole.deleteMany({ where: { contractorId: loser.id } });

    if (loser.contractorLogin && keep.contractorLogin) {
      await tx.contractorLogin.delete({ where: { id: loser.contractorLogin.id } });
    } else if (loser.contractorLogin) {
      await tx.contractorLogin.update({
        where: { id: loser.contractorLogin.id },
        data: { contractorId: keep.id, email: keep.email },
      });
    }

    const data = {};
    for (const f of fills) data[f] = loser[f];
    data.notes = [
      keep.notes,
      "--- Merged in " + (loser.ref || loser.id) + " on " + new Date().toISOString().slice(0, 10) + " ---",
      snapshot,
    ]
      .filter(Boolean)
      .join("\n");
    await tx.contractor.update({ where: { id: keep.id }, data });

    await tx.contractor.delete({ where: { id: loser.id } });

    await tx.activityLog.create({
      data: {
        action: "CONTRACTOR_MERGED",
        entityType: "Contractor",
        entityId: keep.id,
        userEmail: "script:merge-contractors",
        details: JSON.stringify({
          keep: { id: keep.id, ref: keep.ref, email: keep.email },
          merged: { id: loser.id, ref: loser.ref, email: loser.email },
          rowsMoved: total,
          fieldsFilled: fills,
          conflictsLeftAlone: conflicts,
        }),
      },
    });
  });

  console.log(
    "\n" + "=".repeat(74) + "\n  DONE. " + total + " row(s) moved; " +
      (loser.ref || loser.id) + " deleted and archived into\n  " +
      (keep.ref || keep.id) + "'s notes. Logged as CONTRACTOR_MERGED.\n" + "=".repeat(74) + "\n"
  );
}

main()
  .catch((e) => {
    console.error("\n  " + e.message + "\n");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
