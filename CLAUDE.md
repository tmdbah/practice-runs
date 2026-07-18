@AGENTS.md

## Claude Code Specific

### Plan Mode Requirements

Use `/plan` before modifying files in:

- `src/app/` (routing and layouts)
- Any database schema files
- Any auth-related files

### File Operations

- Do not delete files without explicit confirmation
- Do not `rm -rf` anything without asking
- Check that tests pass after significant changes (`npm test`)

### Preferred Workflow

1. Read relevant files before making changes
2. Make targeted edits — avoid rewriting files that don't need changes
3. Run lint after edits: `npm run lint`
4. Flag if a change will affect more than 3 files — confirm before proceeding
