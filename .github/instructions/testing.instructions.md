---
applyTo: "**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx"
---

## Testing Rules

- Use descriptive test names: `it('should [behavior] when [condition]')`
- One assertion per test when possible — split complex tests
- Test behavior, not implementation — avoid testing internal state
- Use `beforeEach` for setup, `afterEach` for teardown
- Mock external APIs and modules — tests should not make real network calls
- Co-locate test files next to the file under test: `component.test.tsx` alongside `component.tsx`
