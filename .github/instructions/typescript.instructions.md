---
applyTo: "**/*.ts,**/*.tsx"
---

## TypeScript Rules

- Strict mode — no `any`, no `as any` casts
- Always define return types on exported functions
- Use named exports — no default exports
- Prefer `interface` for object shapes, `type` for unions and primitives
- Use `unknown` instead of `any` when type is truly unknown

## React / Next.js Rules

- Functional components only — no class components
- Define props with a named `interface` above the component
- Co-locate component styles, types, and hooks in the same directory
- Use `'use client'` directive only when DOM/browser APIs are required
- Server Components are the default — opt into client only when needed

## Naming

- Components: `PascalCase`
- Hooks: `useCamelCase`
- Files: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- Types/interfaces: `PascalCase` (no `I` prefix)
