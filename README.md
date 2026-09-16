# PRISM

PRL Site Solutions' internal workforce management portal — HR, compliance/QMS,
billing and contractor onboarding in one app.

- **Live:** https://www.prismworkforce.online
- **Hosting:** Railway (not Vercel) — auto-deploys on push to `master`
- **Stack:** Next.js 16 (App Router), Prisma 6, PostgreSQL, NextAuth v5, Tailwind 4, TypeScript

## Warning

This codebase's data model holds NI numbers, right-to-work/passport/visa
documents, medical notes, pay rates and invoices. **Keep the GitHub repo
private.**

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in real values — see that file for
which vars are required vs optional. Local `.env` should never hold
production credentials; those live in Railway's environment variables.

## Commands

```bash
npm run dev        # local dev server
npm test            # unit suite — no database, ~1s (needs Node 21+ locally; CI pins Node 24)
npx tsc --noEmit    # typecheck
npm run build       # production build
npm run lint        # lint
```

`npm run smoke` hits **production** — do not run it casually.

`prisma generate` EPERMs on Windows while `npm run dev` is running; stop the
dev server first.

Node: `engines.node` is pinned to `>=20.9.0` for the Railway runtime. Tests
want Node 21+ locally.

## More docs

- [`CLAUDE.md`](./CLAUDE.md) — agent/operating rules for this repo
- [`/docs`](./docs) — deeper documentation
