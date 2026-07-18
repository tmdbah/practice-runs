# AI Augmented Workflow — Reference Guide

> **Purpose:** Quick-reference for setting up GitHub Copilot and Claude Code on any project. Covers config files, sync strategy, platform differences, and daily workflow.
> **Last reviewed:** May 2026

---

## 1. TL;DR — Side-by-Side Comparison

|                         | **GitHub Copilot**                                                                       | **Claude Code CLI**                                         | **Claude.ai Web**                  |
| ----------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| **Primary use**         | Inline completions, code review                                                          | Full agentic coding sessions                                | Brainstorming, artifact generation |
| **Interface**           | VS Code, GitHub.com, `gh` CLI                                                            | Terminal (`claude` command)                                 | Browser                            |
| **Context loaded from** | `.github/copilot-instructions.md`, `AGENTS.md`, `.github/instructions/*.instructions.md` | `CLAUDE.md`, `AGENTS.md`, `.claude/rules/*.md`, auto-memory | Project system prompt (set in UI)  |
| **Shared config**       | `AGENTS.md` ✓                                                                            | `AGENTS.md` ✓                                               | Manual paste / attach              |
| **Path-scoped rules**   | `.github/instructions/*.instructions.md` (applyTo glob)                                  | `.claude/rules/*.md` (paths: frontmatter)                   |                                    |
| **Personal overrides**  | GitHub.com UI (not version-controlled)                                                   | `CLAUDE.local.md`, `~/.claude/CLAUDE.md`                    |                                    |
| **Memory / learning**   | None                                                                                     | Auto-memory (`~/.claude/projects/<repo>/memory/`)           |                                    |
| **Plan before acting**  | Not built-in                                                                             | `/plan` mode (safer for large changes)                      |                                    |
| **Reusable prompts**    | `.github/prompts/*.prompt.md`                                                            | `@` file references in chat                                 |                                    |
| **Strengths**           | Speed, inline, code review, `.instructions.md` path rules                                | Agentic tasks, memory, file ops, safe planning              | Long-form reasoning, artifacts     |
| **Weaknesses**          | No memory, no plan mode, limited file ops                                                | Slower for single-line completions                          | Can't edit your repo directly      |

---

## 2. Config File Map

### Files both tools read

| File        | Location                  | Scope                                      | What goes here                                           |
| ----------- | ------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| `AGENTS.md` | Repo root or subdirectory | All agents (Copilot, Claude, Gemini, etc.) | Architecture, build commands, conventions, key decisions |

### GitHub Copilot — specific files

| File                      | Location                      | Scope                            | Priority                        | What goes here                                                     |
| ------------------------- | ----------------------------- | -------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `copilot-instructions.md` | `.github/`                    | All Copilot interactions in repo | Auto-included                   | Copilot-formatted version of project context, tech stack, commands |
| `*.instructions.md`       | `.github/instructions/`       | Files matching `applyTo` glob    | Auto-included when file matches | Language-specific rules, module conventions                        |
| `*.prompt.md`             | `.github/prompts/`            | Manual — attach in chat          | On-demand                       | Reusable workflows, feature scaffolding templates                  |
| Personal instructions     | GitHub.com → Copilot settings | Your account (all repos)         | User-level                      | Preferred tone, personal style (not version-controlled)            |

**Requires this VS Code setting:**

```json
{
  "github.copilot.codeGeneration.useInstructionFiles": true,
  "chat.promptFiles": true
}
```

### Claude Code — specific files

| File                  | Location                            | Scope                               | Priority                | What goes here                                    |
| --------------------- | ----------------------------------- | ----------------------------------- | ----------------------- | ------------------------------------------------- |
| `CLAUDE.md`           | Repo root or `.claude/`             | Project (git-tracked)               | Project-level           | `@AGENTS.md` import + Claude-specific additions   |
| `CLAUDE.local.md`     | Repo root                           | Project (gitignored)                | Personal override       | Your personal preferences not shared with team    |
| `~/.claude/CLAUDE.md` | User home                           | All projects                        | User-level              | Always-on preferences (language, style, habits)   |
| `settings.json`       | `.claude/`                          | Project                             | Project-level           | Permissions, tool access, model preferences       |
| `*.md` rules          | `.claude/rules/`                    | Files matching `paths:` frontmatter | On-demand               | Path-scoped modular rules                         |
| Auto memory           | `~/.claude/projects/<repo>/memory/` | This repo only                      | Auto-loaded (200 lines) | Claude writes this — learnings from your sessions |

**Useful Claude Code commands:**

```
/status     — shows which config files are currently loaded
/memory     — browse and edit CLAUDE.md, rules, and auto-memory
/plan       — enter plan mode (read-only planning before changes)
```

---

## 3. Sync Strategy — Single Source of Truth

The goal: write context once, both tools pick it up.

```
AGENTS.md
│
├── Read directly by: GitHub Copilot, Claude Code, Gemini, future agents
│
├── CLAUDE.md
│   └── @AGENTS.md ← imports AGENTS.md at startup
│       + Claude Code-specific instructions below
│
└── .github/copilot-instructions.md
    └── Copilot-optimized rewrite of AGENTS.md context
        + Copilot-specific instructions below
```

### What goes where

**In `AGENTS.md` (shared — both tools read this):**

- Project overview and goals
- Tech stack and versions
- Directory structure
- Build, test, lint commands
- Architecture decisions
- Things NOT to do (gotchas, anti-patterns)

**Add to `CLAUDE.md` only:**

- `@AGENTS.md` at the top (imports shared context)
- Plan mode requirements (`/plan` for changes to X module)
- Claude Code-specific tool permissions
- File/module boundaries Claude should respect

**Add to `.github/copilot-instructions.md` only:**

- Same context as `AGENTS.md` but formatted for Copilot's preferences (shorter, more direct)
- Code review guidelines (used when Copilot reviews PRs)
- Inline completion preferences (e.g., "always add JSDoc")

### Updating the shared config

When you change `AGENTS.md`:

1. Update `AGENTS.md` with the new information
2. Mirror relevant parts to `.github/copilot-instructions.md` if wording matters for Copilot
3. `CLAUDE.md` picks it up automatically via `@AGENTS.md`

---

## 4. Platform-Specific Optimizations

### GitHub Copilot — get the most out of it

**Use path-scoped instruction files** (biggest quality lever):

```yaml
# .github/instructions/typescript.instructions.md
---
applyTo: "**/*.ts,**/*.tsx"
---
- Use strict TypeScript (no `any`)
- Prefer named exports over default exports
- Always define return types on functions
```

This means Copilot applies TypeScript rules only to `.ts`/`.tsx` files — no bleed into Python or SQL.

**Write `copilot-instructions.md` like a brief:**

- Keep it under 2 pages (~400 words)
- Lead with: project type, stack, main directories
- List commands (build, test, lint) on the first screen
- Copilot reads this in every chat — verbosity hurts, precision wins

**Use prompt files for repeated workflows:**

```markdown
# .github/prompts/new-feature.prompt.md

Create a new [FEATURE_NAME] feature:

1. Component in `src/components/[name]/`
2. Hook in `src/hooks/use-[name].ts`
3. Update `src/app/page.tsx` to include it
   Follow patterns in [src/components/existing-example](../../src/components/existing-example).
```

Attach with `/` in Copilot Chat.

### Claude Code CLI — get the most out of it

**Use `/plan` for any non-trivial change.** Claude maps out what it will do before touching files. Prevents cascading mistakes in large refactors.

**Let auto-memory work.** Claude notes things like "user prefers named exports" or "npm run dev uses port 3001" after you correct it once. It loads this at every session startup — you don't have to re-explain your preferences.

**Use `@` imports to chain context:**

```markdown
# CLAUDE.md

@AGENTS.md
@context/NoBadBite-ProjectSpec.md

## Claude Code Specific

Use plan mode before modifying any file under `src/app/`.
```

**`CLAUDE.local.md` for personal preferences** (gitignored — stays on your machine):

```markdown
# CLAUDE.local.md

- I prefer verbose explanations when making architectural decisions
- Always check with me before deleting any file
- My preferred diff view: side-by-side
```

**`~/.claude/CLAUDE.md` for cross-project habits** (applies everywhere):

```markdown
- Use 2-space indentation unless the project uses something else
- Prefer TypeScript over JavaScript when given a choice
- Never use `any` type
- Ask before running `rm` commands
```

### Claude.ai Web / Projects

**Use for:** Brainstorming, spec writing, PRD generation, design decisions. Output becomes source material for `AGENTS.md` or the project spec.

**Project system prompt** (set once in Project settings):

- Paste your `AGENTS.md` content here for persistent context
- Keeps context alive across browser sessions without re-pasting
- Syncs your brainstorm sessions with your actual project constraints

**Workflow:** Brainstorm in Claude.ai → export artifact → paste into `AGENTS.md` or `context/ProjectSpec.md` → commit → Claude Code and Copilot pick it up

---

## 5. Project Init Checklist

Copy this when starting a new project. Order matters.

### Step 1 — Copy the template

The fastest path is copying the pre-built template from this repo:

```bash
cp -r /path/to/nobadbite/_templates/new-project/. /path/to/new-project/
```

**What needs changes after copying:**

- `AGENTS.md` — fill in all placeholders (project name, stack, commands, directories)
- `.github/copilot-instructions.md` — mirror the essentials from `AGENTS.md` in Copilot's preferred format

**What needs no changes:**

- `CLAUDE.md` — already imports `AGENTS.md` via `@AGENTS.md`, picks up your content automatically
- `.github/instructions/*.instructions.md` — rules are generic TypeScript/testing standards; edit only if your project has different conventions
- `.claude/settings.json` — safe defaults work for any project
- `.vscode/settings.json` — no changes needed

If you prefer to start from scratch:

```bash
# In your new project root
touch AGENTS.md CLAUDE.md
mkdir -p .github/instructions .github/prompts .claude/rules
touch .github/copilot-instructions.md .claude/settings.json .vscode/settings.json
```

### Step 2 — Fill in `AGENTS.md` first

Answer these in the file:

- [ ] What is this project? (1-2 sentences)
- [ ] Tech stack with versions
- [ ] Key directories and what's in them
- [ ] Build command
- [ ] Test command
- [ ] Lint/format command
- [ ] Anything AI should NOT do

### Step 3 — Set up `CLAUDE.md`

```markdown
@AGENTS.md

## Claude Code Specific

- Use /plan mode before modifying files in [list critical dirs]
- Do not delete files without confirmation
```

### Step 4 — Set up `.github/copilot-instructions.md`

Mirror the essentials from `AGENTS.md`. Add Copilot-specific notes:

```markdown
# [Project Name]

[1-sentence description]

## Stack

- [framework] [version]
- [language] [version]

## Key Directories

- `src/` — [description]

## Commands

- Build: `[command]`
- Test: `[command]`
- Dev: `[command]`

## Copilot Guidelines

- [code style rules]
- [what not to generate]
```

### Step 5 — Add path-scoped instruction files (optional but high-value)

Create one per language or major module you use. Template:

```yaml
---
applyTo: "**/*.ts,**/*.tsx"
---
[TypeScript-specific rules]
```

### Step 6 — Enable VS Code settings

```json
// .vscode/settings.json
{
  "github.copilot.codeGeneration.useInstructionFiles": true,
  "chat.promptFiles": true
}
```

### Step 7 — Verify setup

**For Claude Code:**

```bash
claude
/status
# Confirm AGENTS.md and CLAUDE.md appear in loaded files
```

**For Copilot:**

- Open Copilot Chat in VS Code
- Ask: "What project is this?"
- Scroll to bottom of response — confirm `.github/copilot-instructions.md` appears in references

---

## 6. Daily Workflow

| Task                                 | Tool                         | Why                                                                 |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------- |
| Scaffold a new component/feature     | Claude Code CLI              | Agentic — reads your full context, creates multiple files correctly |
| Inline code completion               | Copilot (VS Code)            | Fastest, right in the editor                                        |
| Code review before committing        | Copilot (VS Code sidebar)    | Reads your `.instructions.md` rules per file type                   |
| Refactor a module                    | Claude Code CLI with `/plan` | Plan mode prevents broken states                                    |
| Debug a tricky error                 | Claude Code CLI              | Can read files, run commands, check output                          |
| Brainstorm a new feature or spec     | Claude.ai web                | Long reasoning, artifact generation, no project context needed      |
| Turn a Claude.ai artifact into code  | Claude Code CLI              | `@` import the artifact or paste into spec file                     |
| Explain unfamiliar code              | Either                       | Both handle this well                                               |
| Generate boilerplate from a template | Copilot prompt files         | `.github/prompts/*.prompt.md` for repeatable patterns               |

---

## 7. Quick Reference — File Purposes

```
PROJECT ROOT
│
├── AGENTS.md                              ← Shared source of truth (all AI reads this)
├── CLAUDE.md                              ← @AGENTS.md + Claude Code-specific
├── CLAUDE.local.md                        ← Personal overrides, gitignored
│
├── .github/
│   ├── copilot-instructions.md            ← Auto-included in all Copilot interactions
│   ├── instructions/
│   │   ├── typescript.instructions.md     ← applyTo: **/*.ts,**/*.tsx
│   │   ├── testing.instructions.md        ← applyTo: **/*.test.*
│   │   └── [module].instructions.md       ← applyTo: src/[module]/**
│   └── prompts/
│       ├── new-feature.prompt.md          ← Scaffold a new feature
│       └── code-review.prompt.md          ← Code review checklist
│
├── .claude/
│   ├── settings.json                      ← Project-level Claude Code settings
│   ├── settings.local.json                ← Personal settings, gitignored
│   └── rules/
│       └── [topic].md                     ← paths: frontmatter for path-scoped rules
│
└── .vscode/
    └── settings.json                      ← useInstructionFiles: true, chat.promptFiles: true
```

---

## 8. `.gitignore` Additions

Add these to keep personal configs out of git:

```gitignore
# Claude Code personal configs
CLAUDE.local.md
.claude/settings.local.json
```

---

## Appendix — Copilot Workspaces (not yet explored)

Copilot Workspaces is a cloud-hosted environment where Copilot Cloud Agent makes commits, runs builds, and creates PRs on your behalf. It triggers when creating a PR on GitHub.com. It reads `.github/copilot-instructions.md` — so a well-written instructions file is the entry point. Worth exploring once the daily CLI workflow is solid.
