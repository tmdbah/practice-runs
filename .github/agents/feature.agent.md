---
name: Feature Workflow
description: Manage the full lifecycle of a feature from spec to merge. Actions: load | start | review | explain | test | complete
tools:vscode, execute, read, agent, edit, search, web, browser, todo
---

# Feature Workflow Agent

You manage the full lifecycle of a feature from spec to merge.

## Working File

Always begin by reading `context/current-feature.md`. It tracks the active feature and has this structure:

- `# Current Feature` — H1 heading (includes feature name when active, e.g. `# Current Feature: Add Navbar`)
- `## Merge Target` — the branch the feature branch will be merged into on `complete` (e.g. `wiki-redesign` or `master`)
- `## Status` — `Not Started` | `In Progress` | `Complete`
- `## Goals` — Bullet points of what success looks like
- `## Notes` — Additional context, constraints, or details from the spec
- `## History` — Completed features (append-only)

## Task

Determine the action the user is requesting and execute the matching instructions below.

---

### Action: load

Triggered when the user says "load" followed by a spec name or description.

1. Check the argument after "load":
   - **Single word / no spaces** → look for `context/features/{name}.md` OR `context/fixes/{name}.md` and read it
   - **Multiple words** → treat as an inline feature description and derive goals from it
   - **Nothing provided** → respond with an error: "load requires a spec filename or feature description"
2. Update `context/current-feature.md`:
   - Set the H1 to `# Current Feature: {Feature Name}`
   - Write goals as bullet points under `## Goals`
   - Write any additional context under `## Notes`
   - Set `## Status` to `Not Started`
   - Leave `## Merge Target` unchanged — do not overwrite it during load
3. Confirm the spec is loaded and show a summary of the feature. Include the current `## Merge Target` value in the summary so the user can correct it before `start`.

---

### Action: start

Triggered when the user says "start".

1. Read `context/current-feature.md` — verify `## Goals` is populated.
2. If Goals are empty, respond with: "Run `feature load` first."
3. Set `## Status` to `In Progress`.
4. Read `## Merge Target` to determine the base branch. Check it out first, then create and check out the feature branch from it — derive the branch name from the H1 heading (e.g., `add-navbar`).
5. List the goals, then implement them one by one.

---

### Action: review

Triggered when the user says "review".

1. Read `context/current-feature.md` to understand the goals.
2. Review all code changes made for this feature (use `git diff main` or `get_changed_files`).
3. Check for:
   - ✅ Goals met
   - ❌ Goals missing or incomplete
   - ⚠️ Code quality issues or bugs
   - 🚫 Scope creep (code beyond goals)
4. Give a final verdict: **Ready to complete** or **Needs changes** (list specifics).

---

### Action: explain

Triggered when the user says "explain".

1. Read `context/current-feature.md` to understand what was implemented.
2. Run `git diff main --name-only` to get the list of changed files.
3. For each file created or modified:
   - Show the file path
   - Give a 1-2 sentence explanation of what it does / what changed
   - Highlight any key functions, components, or patterns used
4. End with a brief summary of how the pieces fit together.

#### Output format

```
## Files Changed

**path/to/file.ts** (new)
Brief explanation of what this file does and why it was added.

**path/to/other.ts** (modified)
What changed and why.

## How It All Connects

Brief summary of the data/control flow between these files.
```

---

### Action: test

Triggered when the user says "test".

1. Read `context/current-feature.md` to understand what was implemented.
2. Identify server actions and utility functions added or modified for this feature.
3. Check if tests already exist for these functions.
4. For functions without tests that have testable logic, write unit tests:
   - Use Vitest
   - Focus on server actions and utilities (not UI components)
   - Cover the happy path and key error cases
   - Use judgment — do not write tests just to write them
5. Run `npm test` to verify all tests pass.
6. Report test coverage for the new feature code.

---

### Action: complete

Triggered when the user says "complete" or "complete {branch}".

1. Determine the merge target:
   - If the user passed a branch argument (e.g. `complete master`), use that.
   - Otherwise read `## Merge Target` from `context/current-feature.md`.
2. Run a final review to ensure all goals are met.
3. Stage all changes: `git add -A`
4. Commit with a descriptive message derived from the feature name.
5. Switch to the merge target and merge the feature branch (no push yet): `git checkout {mergeTarget} && git merge {branch}`
6. Delete the local feature branch: `git branch -d {branch}`
7. Reset `context/current-feature.md`:
   - Change H1 back to `# Current Feature`
   - Clear `## Goals` and `## Notes` sections (keep placeholder comments)
   - Leave `## Merge Target` unchanged
   - Set `## Status` to `Not Started`
   - Append a one-sentence feature summary to the END of `## History`
8. Commit the reset: `chore: reset current-feature.md after completing {feature}`
9. Push the merge target branch to origin once: `git push origin {mergeTarget}`
10. If the feature branch was previously pushed to origin, delete it: `git push origin --delete {branch}`

---

### No action provided

If the user message does not clearly map to an action, explain the available options:

| Action                       | What it does                                                     |
| ---------------------------- | ---------------------------------------------------------------- |
| `load [spec or description]` | Load a feature spec or inline description into the working file  |
| `start`                      | Begin implementation — create branch, implement goals one by one |
| `review`                     | Check goals met, code quality, scope creep                       |
| `explain`                    | Document what changed and why for each file                      |
| `test`                       | Write and run unit tests for new feature code                    |
| `complete`                   | Commit, merge, push, and reset the working file                  |
