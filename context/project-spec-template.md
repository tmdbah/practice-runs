# [App Name] — Project Spec

> **Tagline:** [One punchy sentence. What is this?]
> **Status:** [Brainstorm / In Progress / Shipped]
> **Version:** [e.g., V1 — MVP]

---

## How to Use This Template

### The Flow

```
1. Brainstorm  →  AI generates .html visual plan          (attach this template as context)
2. Fill spec   →  AI produces project-spec.md from .html  (filling in all sections below)
3. Enrich      →  AI enriches spec → project-overview.md (replaces the spec — see prompt below)
4. Build       →  .html + project-overview.md stay in lockstep throughout development
```

### The 3 Files Per Project

| File                           | Role                                                                 | Notes                                       |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------- |
| `[AppName]-ProjectPlan.html`   | Visual brainstorm artifact — rendered in the browser                 | Generated in step 1                         |
| `[AppName]-ProjectSpec.md`     | Intermediate working doc — filled from this template                 | Generated in step 2; discarded after step 3 |
| `[AppName]-ProjectOverview.md` | Enriched source of truth — what AI reads before every coding session | Generated in step 3; supersedes the spec    |

### Lockstep Prompt (use anytime during development)

> _"Update both `[AppName]-ProjectPlan.html` and `[AppName]-ProjectOverview.md` to stay in lockstep with this change."_

### Enrichment Prompt (step 3 — produces the overview)

> _"I am building an app and potential SaaS called [App Name]. Below are my planning notes from `[AppName]-ProjectSpec.md`. Review and clean as you see fit. Format with things like TypeScript types, data diagrams, icons, links, and any other info you think is relevant. Produce a comprehensive `[AppName]-ProjectOverview.md`. Also update `[AppName]-ProjectPlan.html` to stay in lockstep with any changes."_

---

## Problem

<!--
What problem are you solving? Who feels this pain? Why does it matter?
Answer: "Without this app, people have to ___."
Keep it to 2–4 sentences.
-->

**The problem:**  
[Describe the pain point clearly and concisely.]

**Why existing solutions fall short:**  
[Why doesn't Google / a notes app / a spreadsheet already solve this?]

---

## Users

<!--
Who is this for? Be specific. Generic answers ("anyone who...") are useless here.
List 2–4 distinct user types. For personal apps, a single user profile is fine.
-->

- **[Primary User]:** [Who they are + what they specifically need]
- **[Secondary User]:** [Who they are + what they specifically need]

**Scope note:** [Personal tool / friends & family / public / SaaS — be honest about who this is really for in V1]

---

## Features

<!--
What does the MVP need? Be ruthless — only features required to validate the core idea.
Anything you're unsure about goes in V2. V3 is "nice to have, don't think about it yet."
-->

### V1 — Ship It

_The minimum needed to actually use the app and get value from it._

| Feature        | Description                       | Priority    |
| -------------- | --------------------------------- | ----------- |
| [Feature Name] | [What it does and why it matters] | Must Have   |
| [Feature Name] | [What it does and why it matters] | Must Have   |
| [Feature Name] | [What it does and why it matters] | Should Have |

**MVP success criteria:** [How will you know V1 is working? e.g., "I use it every day for a week without needing anything else."]

### V2 — After Real Usage

_Add only what you actually miss after using V1 for a few weeks._

- [Feature idea]
- [Feature idea]

### V3 — Future / Nice to Have

_Don't think about these until V2 is done._

- [Feature idea]
- [Feature idea]

---

## Data

<!--
What are you storing? Where? Define your models.
Start simple. Only step up the storage strategy when the schema is proven stable.
-->

### Storage Strategy

| Phase | Storage                                     | Trigger to Upgrade                     |
| ----- | ------------------------------------------- | -------------------------------------- |
| V1    | [e.g., localStorage / static files / no DB] | [e.g., need sync across devices]       |
| V1.5+ | [e.g., Neon + Prisma]                       | [e.g., multi-user or auth needed]      |
| V2+   | [e.g., add Redis / blob storage]            | [e.g., file uploads or caching needed] |

### Models

<!--
Define each data model. Use TypeScript types or plain fields — whichever is clearest.
Only model what V1 actually stores. Don't pre-design for V3.
-->

**[ModelName]**

```ts
type [ModelName] = {
  id: string;
  // add fields here
  createdAt: string; // ISO timestamp
};
```

**[ModelName]**

```ts
type [ModelName] = {
  id: string;
  // add fields here
};
```

---

## Tech Stack

<!--
What stack are you using and why? Be specific about versions when it matters.
Include links to key docs so AI assistants can fetch them as context.
-->

| Layer         | Technology                                  | Notes             |
| ------------- | ------------------------------------------- | ----------------- |
| Framework     | [e.g., Next.js App Router, latest stable]   | [Why this choice] |
| Language      | [e.g., TypeScript — always]                 |                   |
| Styling       | [e.g., Tailwind CSS v4 + ShadCN]            |                   |
| Database      | [e.g., Neon + Prisma / localStorage for V1] |                   |
| Auth          | [e.g., NextAuth v5 / none for V1]           |                   |
| AI            | [e.g., Anthropic SDK / none for V1]         |                   |
| External APIs | [e.g., Google Places API]                   |                   |
| Hosting       | [e.g., Vercel]                              |                   |
| Other         |                                             |                   |

**Key decisions & tradeoffs:**

- [Decision]: [Why you chose it over the alternative]
- [Decision]: [Why you chose it over the alternative]

---

## Monetization

<!--
How will this make money? If it's a personal tool, say so — that's a valid answer.
If there's any chance this becomes a product, define the model now so architecture decisions reflect it.
-->

**Model:** [Free / Freemium / One-time purchase / Subscription / Personal tool — no monetization]

### Free Tier

- [What's included]
- [What's limited]

### Paid Tier — [Price/month or one-time]

- [What unlocks]
- [What the upgrade trigger is]

**Monetization note:** [When will you think about this? e.g., "Not until V2 is shipping to real users."]

---

## UI/UX

<!--
How should this look and feel? Define the vibe, not just the colors.
Reference real apps/sites that nail the aesthetic you're going for.
-->

### Design Direction

- **Vibe:** [e.g., clean and minimal / bold and energetic / warm and personal]
- **Theme:** [Light / Dark / Both / Light default]
- **Layout:** [e.g., single-column mobile-first / sidebar + content / card grid]
- **Typography feel:** [e.g., friendly and readable / technical and dense]

### References

- [App or site name] — [what specifically to borrow from it]
- [App or site name] — [what specifically to borrow from it]

### Color Palette

| Token      | Hex       | Usage                |
| ---------- | --------- | -------------------- |
| Primary    | `#______` | [CTAs, key actions]  |
| Background | `#______` | [Page background]    |
| Surface    | `#______` | [Cards, panels]      |
| Text       | `#______` | [Body copy]          |
| Accent     | `#______` | [Highlights, badges] |

### Key Screens / Flows

<!--
List the core screens or user flows. You don't need mocks — just names and what they do.
-->

| Screen        | Purpose                   |
| ------------- | ------------------------- |
| [Screen Name] | [What the user does here] |
| [Screen Name] | [What the user does here] |

### Mobile / Responsive

[Mobile-first or desktop-first? Any PWA considerations? Offline needs?]

---

## Document

<!--
This section is for AI context. List everything an AI assistant should have access to
when helping you build this project. Update this as the project grows.

How to use: When starting a new AI chat session, paste this section as context
or attach the files listed here.
-->

### Project Context Files

| File              | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `[filename].md`   | [e.g., This spec — full project context]              |
| `[filename].html` | [e.g., Visual project plan / brainstorm artifact]     |
| `[filename].md`   | [e.g., Project overview / detailed feature breakdown] |

### Key Docs & References

<!--
Paste URLs to docs the AI should read before writing code.
Especially important for: framework versions, APIs with breaking changes, libraries with tricky setup.
-->

- [Library/API Name]: [URL to specific docs page]
- [Library/API Name]: [URL to specific docs page]

### AI Working Rules

<!--
Standing instructions to include at the start of AI sessions for this project.
Copy-paste these into the system prompt or first message.
-->

```
Project: [App Name]
Stack: [e.g., Next.js App Router (latest), TypeScript, Tailwind CSS v4, ShadCN]
Current phase: [e.g., V1 MVP — localStorage only, no auth, no DB]

Rules:
- Read the attached project-spec.md before writing any code
- Do not add features beyond what's in the V1 spec
- [Any other standing rules]
- TypeScript always — no plain JS
- [Styling rules, e.g., Tailwind only — no inline styles]
```

### Open Questions

<!--
Decisions not yet made. Revisit before starting the relevant feature.
-->

- [ ] [Question or undecided design choice]
- [ ] [Question or undecided design choice]

---

_Generated from `project-spec-template.md` · Keep `[AppName]-ProjectOverview.md`, `[AppName]-ProjectPlan.html`, and the codebase in lockstep._
