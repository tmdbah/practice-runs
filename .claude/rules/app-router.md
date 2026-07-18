---
paths:
  - "src/app/**"
---

## App Router Rules

- All routes in `src/app/` follow Next.js App Router conventions
- Use Server Components by default — add `'use client'` only when necessary
- Layouts at `layout.tsx`, pages at `page.tsx`, loading states at `loading.tsx`
- Route handlers go in `src/app/api/[route]/route.ts`
- No direct database calls in page components — use server actions or API routes
