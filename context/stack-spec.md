# stack-spec.md
# StackFlow — AI Spec File
# Keep under 250 lines.
# Last updated: 2026-05

---

## Priority Order
1. Existing project conventions (always match what's already there)
2. Context-specific rules below
3. StackFlow defaults
4. Latest stable versions

---

## Core Philosophy
One stack, three complexity levels. Start at the simplest level that meets the project's needs.
Every step up requires a clear justification — complexity is earned, not assumed.
The level defines the **eventual target stack**, not what is active on day one.
Projects are built in phases. A Level 3 project may start with localStorage and no auth — that is intentional.

---

## Complexity Levels

### Level 1 — Static (default starting point)
Also called: **Starter** in client-facing quotes.
For: marketing sites, landing pages, simple projects with no dynamic data or user accounts.
- Framework: Next.js (latest stable, App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4 — custom components only, no ShadCN
- Hosting: Managed cloud hosting (static-optimized provider)
- Forms: Netlify Forms — no backend code, no third-party email service
- Images: /public folder; CDN image service only if volume demands it
- Rendering: SSG — no SSR unless dynamic data explicitly requires it
- CMS: None unless explicitly required

Step up to Level 2 when: the project needs dynamic data, user interaction beyond a form, or server-side logic.

### Level 2 — Dynamic (add only what's needed)
Also called: **Business** in client-facing quotes.
For: projects with dynamic requirements, content-heavy sites, simple web apps.
Inherits everything from Level 1, then adds as needed:
- Rendering: SSR or ISR when dynamic data requires it
- Hosting: Dynamic-capable managed cloud hosting
- CMS: if the project needs content management
- API routes: Next.js built-in only — no separate backend unless unavoidable
- UI Components: ShadCN — only for complex UI (forms, modals, tables, dropdowns)

Step up to Level 3 when: the project needs auth, a database, persistent user data, or AI features.

### Level 3 — Full Product (apps with users and data)
Also called: **Custom** in client-facing quotes.
For: personal tools, SaaS products, apps with auth and a real database.
Inherits everything from Level 2, then adds:
- Hosting: Full-stack managed cloud hosting (SSR, edge functions, preview deploys)
- Auth: NextAuth v5
- Database: Serverless PostgreSQL
- ORM: Prisma — all schema changes via migrations, no raw DDL in production
- Email: Transactional email service — only when required
- File Storage: Object storage — only when user file uploads are required
- Caching / Rate Limiting: Serverless Redis — only when explicitly needed
- AI Integration: Anthropic SDK (Claude, claude-sonnet) — only after core product loop is validated
- Validation: Zod — schema validation for API routes, forms, and env variables
- Forms: React Hook Form + Zod — only when forms have complex validation or many fields
- Payments: Stripe — only when the project requires paid plans or transactions

---

## Project Phases

The level defines the target stack — not what ships on day one. Projects are built in phases.

| Phase | Planned? | Typical State |
|---|---|---|
| V1 | Yes | Simplest possible — may use localStorage, no auth, no DB |
| V2 | Yes | Add the next major capability after V1 is validated in daily use |
| V3 | Yes | Scale, multi-user, monetization — only after V2 is validated |
| V1.5 / V2.5 | Unplanned | Point releases for scope that is too large for the current version and too focused to absorb into the next |

Never add next-phase infrastructure to the current phase. Ship it, use it, then upgrade with a real reason.

---

## Client Quote Mapping

| Quote Label | Stack Level | Trigger to Step Up |
|---|---|---|
| Starter | Level 1 | Project needs dynamic data, server-side logic, or beyond-form interaction |
| Business | Level 2 | Project needs auth, a database, persistent user data, or AI |
| Custom | Level 3 | — |

Care Plan tiers (Foundation / Support / Growth / Business System) are independent of project level.
A Starter site can be on any Care Plan. These are separate axes — do not conflate them.

---

## Work Stack (Reference Only — Do Not Apply Unless Explicitly Instructed)

Enterprise stack at current employer. Included to inform overlap decisions and career skill-building.
Do not use any of these in personal or client projects unless there is an explicit reason —
e.g. intentional skill-building on a project where it fits naturally, not forced for its own sake.
AWS may be introduced on a personal project at a phase transition when it fits the upgrade naturally
(e.g. RDS replacing a serverless DB at V2). Do not force AWS into a project where it does not fit.

- Primary: Java + Spring Boot
- Frontend: React + TypeScript
- Databases: PostgreSQL, Oracle
- Cloud: AWS
- IaC: Terraform
- DB Migrations: Liquibase
- CI/CD: Jenkins
- Monitoring: Splunk
- Other: Python, Angular, OCL

---

## Defaults

- Always use TypeScript
- Always use latest stable LTS versions — check existing project before choosing
- App Router only — no Pages Router
- Functional components and hooks only — no class components
- Mobile-first responsive design
- Environment variables in .env.local — never hardcode secrets
- Default to Level 1 — justify every step up in complexity
- The level defines the target stack, not what is active today

---

## Rules

### Versioning
- Check existing project's package.json before selecting any version
- Never downgrade a version to match a tutorial — adapt the tutorial instead
- Next.js: latest stable LTS | React: latest stable | Tailwind: v4

### Dependencies
- Prefer built-in Next.js/React solutions before reaching for a package
- Every new dependency needs a clear reason — document it in /decisions
- Do not add a package if native browser APIs or existing deps cover it

### ShadCN
- Level 1: do not use — custom Tailwind components only
- Level 2+: use only for complex UI (forms, modals, tables, dropdowns)

### Auth
- Default: NextAuth v5
- Only replace with Clerk if project timeline requires faster setup and learning isn't the goal

### Database
- Default: Serverless PostgreSQL + Prisma
- Run all schema changes through Prisma migrations — no raw DDL in production

### AI Features
- SDK: Anthropic (Claude) — claude-sonnet as default model
- Do not add AI features until core product loop is validated
- Prompt logic lives in /lib/ai — never inline in components or API routes

### Payments
- Default: Stripe — only when the project explicitly requires paid plans or transactions
- Webhook handling lives in /app/api/webhooks — never inline

---

## DevOps

DevOps expectations scale with project level.

### Git Strategy — GitHub Flow (all levels)

One long-lived branch: `main`. All work on short-lived branches merged via PR.

| Prefix | Use |
|---|---|
| `feature/<name>` | New features or views |
| `fix/<name>` | Bug fixes |
| `chore/<name>` | Config, docs, maintenance |

Always open a PR — never push directly to `main`. Even solo. A PR gets you a preview deploy + CI gate.

### CI/CD by Level

| Area | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| CI | None — lint locally | lint → build (GitHub Actions) | lint → type-check → build → test |
| CD | Auto-deploy on push to `main` | Auto-deploy on merge | Auto-deploy + preview deploy per PR |
| Branch protection | Optional | CI must pass before merge | CI required + self-review before merge |
| Tests | Not required | Unit tests for non-trivial logic | Unit tests for pure functions; E2E before V2 |

### GitHub Actions — Level 3 CI Template

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run build
      - run: npm test
```

### Test Runner
- Default: **Vitest** (native Next.js support, fast, minimal config)
- E2E: **Playwright** — add before V2 ships on Level 3 projects

### Environment Variables
- Local: `.env.local` — never committed
- Production: hosting provider dashboard env settings
- Level 3: validate env vars with Zod at app startup

---

## What AI Should Never Do
- Do not choose a stack not listed here without flagging it first
- Do not use Pages Router or class components
- Do not hardcode API keys or secrets
- Do not install ShadCN on Level 1 projects
- Do not introduce a new database, auth provider, or hosting platform without confirmation
- Do not default to Level 3 when Level 1 will do the job
- Do not add next-phase infrastructure to the current phase
- Do not pull from the Work Stack section without explicit instruction
