---
description: Scaffold a new feature with component, hook, and types
---

Create a new feature called **[FEATURE_NAME]**:

1. **Component** — `src/components/[feature-name]/[FeatureName].tsx`
   - Functional component with typed props
   - Named export

2. **Hook** — `src/hooks/use-[feature-name].ts`
   - Custom hook with logic separated from UI
   - Named export

3. **Types** — add types to `src/types/index.ts` (or create `src/types/[feature-name].ts` if large)

4. **Wire up** — show me where to import and use the component in the existing page

Follow patterns from existing components in `src/components/`.
Check `src/app/page.tsx` for how to integrate into the current layout.
