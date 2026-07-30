/**
 * PRISM smoke test — verifies the public forms actually wire through to PRISM.
 *
 * Usage (credentials are injected by Railway, never hardcoded):
 *     railway run node scripts/smoke-prism.mjs
 *
 * Checks, in order of what has actually bitten us:
 *   1. Public route reachability   — the "links from the website don't work" class
 *   2. Form -> destination table   — the "submissions don't land in PRISM" class
 *   3. Email transport health      — EmailLog rows exist and aren't failing
 *   4. Workflow agents             — whether the scheduled run has ever fired
 *   5. Demo/TEST leftovers         — records left in prod that shouldn't be there
 *
 * Output is deliberately PII-free: counts, timestamps, statuses and ticket refs
 * only. Never print names, emails, addresses or free-text answers — this runs
 * against the live production database.
 */

import { PrismaClient } from "@prisma/client";

// Railway's DATABASE_URL points at postgres.railway.internal, which only resolves
// inside Railway's own network. Running this from a laptop needs the TCP-proxy
// host in DATABASE_PUBLIC_URL, which lives on the Postgres service — hence
// `--service Postgres` below. Prefer it when present, fall back when running
// inside Railway itself.
if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}

if (!process.env.DATABASE_URL) {
  console.error("\n  No database URL in the environment.\n");
  console.error("  Run this via Railway so the credential is injected, never stored:");
  console.error("      railway run --service Postgres node scripts/smoke-prism.mjs\n");
  process.exit(2);
}

const BASE = process.env.SMOKE_BASE_URL || "https://www.prismworkforce.online";
const APEX = "https://prismworkforce.online";

const prisma = new PrismaClient();

let failures = 0;
let warnings = 0;

const pass = (m) => console.log(`  [PASS]  ${m}`);
const fail = (m) => { failures++; console.log(`  [FAIL]  ${m}`); };
const warn = (m) => { warnings++; console.log(`  [WARN]  ${m}`); };
const info = (m) => console.log(`          ${m}`);
const head = (m) => console.log(`\n${m}\n${"-".repeat(m.length)}`);

const DAY = 86_400_000;
const since = (days) => new Date(Date.now() - days * DAY);
const ago = (d) => {
  if (!d) return "never";
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

async function probe(url) {
  try {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    return { status: r.status, location: r.headers.get("location") };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

// ── 1. Public routes ─────────────────────────────────────────────────────────
// These are the URLs the marketing website links to. A 404/500/redirect-to-login
// here means a visitor hits a dead link, regardless of how healthy the app is.
const PUBLIC_ROUTES = [
  "/apply",
  "/new-starter",
  "/payment-query",
  "/grievance",
  "/survey",
  "/supplier-questionnaire",
  "/onboarding",
  "/policy-documents",
  "/privacy",
  "/login",
];

async function checkRoutes() {
  head("1. Public route reachability");

  for (const path of PUBLIC_ROUTES) {
    const r = await probe(BASE + path);
    if (r.status === 200) {
      pass(`${BASE}${path}`);
    } else if (r.status === 0) {
      fail(`${path} — request failed: ${r.error}`);
    } else if (r.status >= 300 && r.status < 400) {
      fail(`${path} — HTTP ${r.status} redirect to ${r.location} (should render, not redirect)`);
    } else {
      fail(`${path} — HTTP ${r.status}`);
    }
  }

  // The apex domain must forward to www *preserving the path*. If it 404s,
  // every non-www link on the marketing site is dead even though the app is fine.
  head("1b. Apex domain (prismworkforce.online, no www)");
  const apexRoot = await probe(APEX + "/");
  const apexPath = await probe(APEX + "/apply");

  if (apexPath.status >= 300 && apexPath.status < 400 && (apexPath.location || "").includes("/apply")) {
    pass("apex forwards deep links to www with the path preserved");
  } else if (apexPath.status === 404) {
    fail("apex/apply returns 404 — deep links WITHOUT www are dead");
    info("Root redirects OK (" + apexRoot.status + ") but paths do not.");
    info("The app's own redirect (next.config.ts + middleware) never runs:");
    info("Railway's edge answers the apex before the request reaches Next.js.");
    info("Fix in Railway domain settings, not in code.");
  } else {
    warn(`apex/apply returned HTTP ${apexPath.status} — expected a path-preserving redirect`);
  }
}

// ── 2. Form wiring ───────────────────────────────────────────────────────────
// Each public form must land a row in its own table. A form that 200s but writes
// nothing is the exact failure the client reported as "forms aren't working".
const FORMS = [
  { form: "/apply",                  model: "contractor",           label: "Applications",          staffPage: "/applicants",                             template: "application-received" },
  { form: "/new-starter",            model: "newStarterSubmission", label: "New starters",          staffPage: "/new-starters",                           template: "new-starter-checklist" },
  { form: "/payment-query",          model: "paymentQuery",         label: "Payment queries",       staffPage: "/payment-queries",                        template: "payment-query" },
  { form: "/grievance",              model: "grievance",            label: "Grievances",            staffPage: "/grievances",                             template: "grievance-submitted" },
  // Added 2026-07-29 (migration 20260729_survey_questionnaire_emaillog) and not
  // linked from anywhere in the app — reachable only by typing the URL directly.
  { form: "/survey",                 model: "customerSurvey",       label: "Customer surveys",      staffPage: "(no staff page)",                         template: "customer-survey",         unlinked: true },
  { form: "/supplier-questionnaire", model: "supplierQuestionnaire",label: "Supplier questionnaires",staffPage: "/qms/reports/supplier-questionnaires",   template: "supplier-questionnaire",  unlinked: true },
];

async function checkFormWiring() {
  head("2. Public form -> PRISM destination table");

  for (const f of FORMS) {
    const delegate = prisma[f.model];
    if (!delegate) {
      fail(`${f.label}: prisma.${f.model} does not exist — form has no destination`);
      continue;
    }

    try {
      const total = await delegate.count();
      const recent = await delegate.count({ where: { createdAt: { gte: since(7) } } });
      const latest = await delegate.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      const when = ago(latest?.createdAt);

      if (total === 0) {
        // An empty table does NOT prove the form is broken — a form with no
        // entry point simply has never been used. Only a real submission can
        // distinguish "unused" from "broken", so report this as unverified
        // rather than failed, and say which it needs.
        warn(`${f.label}: UNVERIFIED — no record has ever landed via ${f.form}`);
        info(`Page returns 200 and POSTs to /api${f.form}, but nothing has been`);
        info(`submitted, so the write path has never actually been exercised.`);
        if (f.unlinked) info(`NB: ${f.form} is not linked from anywhere in the app.`);
      } else if (recent === 0) {
        warn(`${f.label}: ${total} total, but NOTHING in 7 days (last: ${when})`);
        info(`If submissions were made recently, ${f.form} is not wiring through.`);
      } else {
        pass(`${f.label}: ${total} total, ${recent} in last 7d (last: ${when})`);
      }
      info(`surfaced at ${f.staffPage}`);
    } catch (err) {
      fail(`${f.label}: query failed — ${err.message}`);
    }
  }
}

// ── 3. Email health ──────────────────────────────────────────────────────────
// Every send now writes an EmailLog row on success AND failure, so this table
// is the honest record of whether notifications are actually going out.
async function checkEmail() {
  head("3. Email transport health (EmailLog)");

  try {
    const total = await prisma.emailLog.count();
    if (total === 0) {
      fail("EmailLog is empty — no email has been logged at all");
      return;
    }

    const sent7 = await prisma.emailLog.count({ where: { status: "sent", createdAt: { gte: since(7) } } });
    const failed7 = await prisma.emailLog.count({ where: { status: "failed", createdAt: { gte: since(7) } } });

    if (failed7 === 0) {
      pass(`${sent7} sent / 0 failed in last 7 days`);
    } else {
      fail(`${failed7} FAILED sends in last 7 days (${sent7} succeeded)`);
      const byTemplate = await prisma.emailLog.groupBy({
        by: ["template"],
        where: { status: "failed", createdAt: { gte: since(7) } },
        _count: true,
      }).catch(() => []);
      for (const t of byTemplate) info(`failing template: ${t.template} x${t._count}`);
    }

    // Which transport is actually being used — confirms the Graph migration.
    const byProvider = await prisma.emailLog.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: since(7) } },
      _count: true,
    }).catch(() => []);
    for (const p of byProvider) info(`provider ${p.provider ?? "(unset)"}: ${p._count} in 7d`);
  } catch (err) {
    fail(`EmailLog query failed — ${err.message}`);
  }
}

// ── 4. Workflow agents ───────────────────────────────────────────────────────
// Notification parity: a form can land its row perfectly and still be "broken"
// from the business's point of view, because nobody was told. Every submission
// should produce one EmailLog row tagged with that form's template. A surplus of
// submissions means staff are not being notified — silently.
async function checkNotificationParity() {
  head("3b. Notification parity (submission landed -> was anyone told?)");

  // EmailLog only exists from the 2026-07-29 hardening deploy onward, so
  // comparing over a window that predates it would produce false alarms.
  const firstLog = await prisma.emailLog
    .findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } })
    .catch(() => null);

  if (!firstLog) {
    warn("EmailLog has no rows at all — cannot verify any notification was sent");
    return;
  }

  const from = firstLog.createdAt > since(7) ? firstLog.createdAt : since(7);
  info(`comparing since ${from.toISOString().slice(0, 16).replace("T", " ")} (EmailLog start)`);

  for (const f of FORMS) {
    const delegate = prisma[f.model];
    if (!delegate) continue;
    try {
      const submissions = await delegate.count({ where: { createdAt: { gte: from } } });
      if (submissions === 0) continue;

      const notified = await prisma.emailLog.count({
        where: { template: f.template, createdAt: { gte: from } },
      });

      if (notified >= submissions) {
        pass(`${f.label}: ${submissions} submitted, ${notified} notified`);
      } else {
        fail(`${f.label}: ${submissions} submitted but only ${notified} notification(s) sent`);
        info(`${submissions - notified} submission(s) reached PRISM with NOBODY emailed.`);
        info(`template "${f.template}" — check its recipient env var is set.`);
      }
    } catch (err) {
      warn(`${f.label}: parity check failed — ${err.message}`);
    }
  }
}

async function checkWorkflows() {
  head("4. Scheduled workflow agents (WorkflowLog)");

  try {
    const total = await prisma.workflowLog.count();
    if (total === 0) {
      fail("WorkflowLog is empty — the scheduled agents have NEVER run");
      info("Expected until WORKFLOW_SECRET is set as a GitHub repo secret.");
      return;
    }
    const latest = await prisma.workflowLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, workflow: true },
    });
    const recent = await prisma.workflowLog.count({ where: { createdAt: { gte: since(2) } } });

    if (recent === 0) {
      warn(`last agent run was ${ago(latest?.createdAt)} (${latest?.workflow}) — daily schedule not firing`);
    } else {
      pass(`agents ran ${recent}x in last 48h (last: ${latest?.workflow}, ${ago(latest?.createdAt)})`);
    }
  } catch (err) {
    fail(`WorkflowLog query failed — ${err.message}`);
  }
}

// ── 5. Demo leftovers ────────────────────────────────────────────────────────
// TEST records were deliberately left in production as proof during the form
// audit. They should not still be visible to the client.
async function checkDemoLeftovers() {
  head("5. Demo / TEST records still in production");

  try {
    const pq = await prisma.paymentQuery.findMany({
      where: { ticketNumber: { in: ["PQ-003", "PQ-004"] } },
      select: { ticketNumber: true, status: true },
    });
    const grv = await prisma.grievance.findMany({
      where: { ticketNumber: { in: ["GRV-001", "GRV-002"] } },
      select: { ticketNumber: true, status: true },
    });

    const found = [...pq, ...grv];
    if (found.length === 0) {
      pass("no known demo tickets remaining");
    } else {
      warn(`${found.length} demo ticket(s) still present: ${found.map((r) => `${r.ticketNumber}(${r.status})`).join(", ")}`);
      info("These are visible to staff and the client — clean up before any demo.");
    }
  } catch (err) {
    warn(`demo-record check failed — ${err.message}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
console.log("\n==============================================");
console.log("  PRISM smoke test");
console.log(`  target: ${BASE}`);
console.log("==============================================");

try {
  await prisma.$queryRaw`SELECT 1`;
  head("0. Database");
  pass("connected to production PostgreSQL");
} catch (err) {
  console.error(`\n  Cannot reach the database: ${err.message}\n`);
  process.exit(2);
}

await checkRoutes();
await checkFormWiring();
await checkEmail();
await checkNotificationParity();
await checkWorkflows();
await checkDemoLeftovers();

console.log("\n==============================================");
if (failures === 0 && warnings === 0) {
  console.log("  ALL CHECKS PASSED");
} else {
  console.log(`  ${failures} failure(s), ${warnings} warning(s)`);
}
console.log("==============================================\n");

await prisma.$disconnect();
process.exit(failures > 0 ? 1 : 0);
