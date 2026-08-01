# Claude Code Configuration - RuFlo V3

## Project Identity — PRISM Workforce Management Portal

- **Product**: PRISM — internal HR/compliance/QMS portal for PRL Site Solutions
- **Live URL**: https://www.prismworkforce.online
- **GitHub repo**: https://github.com/mcfearless75/prl-staffing
- **Hosting**: Railway (NOT Render, NOT Vercel) — https://railway.com/project/b972e609-db91-4e2d-b293-ee17ce2e590e
- **Database**: Railway PostgreSQL (same project, separate service)
- **File storage**: Cloudflare R2 (env vars: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)
- **Email**: Resend (env var: RESEND_API_KEY) — from address: PRL Site Solutions <infotech@prlsitesolutions.co.uk>
- **Auth**: NextAuth v5 — credentials (staff + contractors) + Microsoft Entra ID SSO for @prlsitesolutions.co.uk
- **Stack**: Next.js 16 App Router + Prisma ORM + PostgreSQL + Tailwind CSS + TypeScript
- **Deploy**: Auto-deploy on push to `master` branch → Railway picks up and rebuilds
- **Local env**: `.env` has 0 credentials — all secrets live in Railway environment variables only
- **IP rate limit**: In-memory map in auth.ts (20 attempts / 15 min per IP) — resets on server restart / new deploy

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## File Organization

- NEVER save to root folder — use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes
- Ensure input validation at system boundaries

### Project Config

- **Topology**: hierarchical-mesh
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

## Build & Test

```bash
# Build
npm run build

# Test — unit suite, no database, ~1s
npm test

# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Smoke — hits PRODUCTION, needs Railway creds
npm run smoke
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing
- `prisma generate` EPERMs on Windows while `npm run dev` is running — stop dev first

### Test suite

`npm test` runs Node's built-in test runner (`node:test`) through `tsx`, which
is already a dependency — the suite adds **no new packages**. Tests live in
`/tests` as `*.test.ts` and import via the `@/` alias.

It is a **unit** suite: no database, no network, no fixtures. That is the point
— it has to be fast enough to run on every change, and the bugs it guards
against were all in pure shared logic, not in queries.

What it covers, and why those things:

| File | Guards |
|---|---|
| `assignment-statuses.test.ts` | `LIVE_ASSIGNMENT_STATUSES` and its subsets. "Which statuses mean the contractor is still working?" was answered differently in ten files; one such split stopped 31 contractors on `Ending` from submitting a timesheet |
| `contractor-statuses.test.ts` | Settable vs pipeline vocabularies. `"On Hold"` was offered by one UI, unreachable from another and rejected by the API |
| `contractor-status.test.ts` | Activate/deactivate transitions, against an in-memory double. Pins that `"On Hold"` and `"Left"` are **never** auto-changed |
| `compliance-score.test.ts` | The compliance denominator counts **distinct people on live work, not assignment rows** — /intelligence divided rows by people and called it a proportion of the workforce |

Two rules for anyone extending it:

- **Test the invariant, not the literal.** Assert that `IN_PROGRESS` is the live
  set minus `Placed`, rather than copying the array — otherwise adding a
  legitimate status fails the suite for no reason, and the copy becomes the
  eleventh disagreeing definition.
- **Mutation-check anything new.** Break the code on purpose and confirm the
  test fails before you trust it. Both invariants above were verified this way.

To keep logic testable, prefer pure functions over inline query bodies:
`summariseCompliance()` and the injectable `ContractorStatusDb` exist precisely
so the rules can be exercised without Postgres.

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal
- Run `npx @claude-flow/cli@latest security scan` after security-related changes

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents, not just MCP
- ALWAYS batch ALL todos in ONE TodoWrite call (5-10+ minimum)
- ALWAYS spawn ALL agents in ONE message with full instructions via Task tool
- ALWAYS batch ALL file reads/writes/edits in ONE message
- ALWAYS batch ALL Bash commands in ONE message

## Swarm Orchestration

- MUST initialize the swarm using CLI tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use CLI tools alone for execution — Task tool agents do the actual work
- MUST call CLI tools AND Task tool in ONE message for complex work

### 3-Tier Model Routing (ADR-026)

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Agent Booster (WASM) | <1ms | $0 | Simple transforms (var→const, add types) — Skip LLM |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Complex reasoning, architecture, security (>30%) |

- Always check for `[AGENT_BOOSTER_AVAILABLE]` or `[TASK_MODEL_RECOMMENDATION]` before spawning agents
- Use Edit tool directly when `[AGENT_BOOSTER_AVAILABLE]`

## Swarm Configuration & Anti-Drift

- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 6-8 for tight coordination
- Use specialized strategy for clear role boundaries
- Use `raft` consensus for hive-mind (leader maintains authoritative state)
- Run frequent checkpoints via `post-task` hooks
- Keep shared memory namespace for all agents

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

## Swarm Execution Rules

- ALWAYS use `run_in_background: true` for all agent Task calls
- ALWAYS put ALL agent Task calls in ONE message for parallel execution
- After spawning, STOP — do NOT add more tool calls or check status
- Never poll TaskOutput or check swarm status — trust agents to return
- When agent results arrive, review ALL results before proceeding

## V3 CLI Commands

### Core Commands

| Command | Subcommands | Description |
|---------|-------------|-------------|
| `init` | 4 | Project initialization |
| `agent` | 8 | Agent lifecycle management |
| `swarm` | 6 | Multi-agent swarm coordination |
| `memory` | 11 | AgentDB memory with HNSW search |
| `task` | 6 | Task creation and lifecycle |
| `session` | 7 | Session state management |
| `hooks` | 17 | Self-learning hooks + 12 workers |
| `hive-mind` | 6 | Byzantine fault-tolerant consensus |

### Quick CLI Examples

```bash
npx @claude-flow/cli@latest init --wizard
npx @claude-flow/cli@latest agent spawn -t coder --name my-coder
npx @claude-flow/cli@latest swarm init --v3-mode
npx @claude-flow/cli@latest memory search --query "authentication patterns"
npx @claude-flow/cli@latest doctor --fix
```

## Available Agents (60+ Types)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Specialized
`security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

### GitHub & Repository
`pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`

## Memory Commands Reference

```bash
# Store (REQUIRED: --key, --value; OPTIONAL: --namespace, --ttl, --tags)
npx @claude-flow/cli@latest memory store --key "pattern-auth" --value "JWT with refresh" --namespace patterns

# Search (REQUIRED: --query; OPTIONAL: --namespace, --limit, --threshold)
npx @claude-flow/cli@latest memory search --query "authentication patterns"

# List (OPTIONAL: --namespace, --limit)
npx @claude-flow/cli@latest memory list --namespace patterns --limit 10

# Retrieve (REQUIRED: --key; OPTIONAL: --namespace)
npx @claude-flow/cli@latest memory retrieve --key "pattern-auth" --namespace patterns
```

## Quick Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

## Claude Code vs CLI Tools

- Claude Code's Task tool handles ALL execution: agents, file ops, code generation, git
- CLI tools handle coordination via Bash: swarm init, memory, hooks, routing
- NEVER use CLI tools as a substitute for Task tool agents

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
