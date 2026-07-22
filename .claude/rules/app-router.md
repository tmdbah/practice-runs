---
paths:
  - "src/app/**"
---

## App Router Rules

- All routes in `src/app/` follow Next.js App Router conventions
- Use Server Components by default — add `'use client'` only when necessary
- Layouts at `layout.tsx`, pages at `page.tsx`, loading states at `loading.tsx`
- Route handlers go in `src/app/api/[route]/route.ts`
- Server Components fetch directly via Prisma (see `coding-standards.md` and `practiceRuns-Architecture.md` §3) — this is the established pattern for this project, not the API-routes-only rule it might look like at a glance. API routes are for client-initiated writes and real integration boundaries, not read paths.
