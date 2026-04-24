# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- `artifacts/api-server` — Express API server (default scaffold).
- `artifacts/mockup-sandbox` — design-time component preview.
- `artifacts/practice` — **IGCSE Add Maths Crash Practice**: a single-student, browser-only self-marking practice web app for a 3-week IGCSE Additional Mathematics crash course. React + Vite + TypeScript + KaTeX + Tailwind v4 + shadcn/ui. No backend, no database, no auth — all progress lives in `localStorage` under key `igcse-add-maths-practice/v1`. Six sections: Algebra Foundations, Quadratics, Differentiation, Trigonometry Survival, Mixed Exam Practice, Mistake Review. Question bank lives in `src/data/questions.ts` (16 questions per topic). Answer normalisation/grading in `src/lib/grade.ts`. Mistakes are added on any wrong answer and only cleared via correct answer **inside** the Mistake Review section or a Redo run. After every check the worked solution panel auto-opens and the correct answer is shown inline; the form is fully keyboard-driven (Enter dispatches Check / Try Again / Next). After a wrong answer the user can either Try Again or Skip to the next question. The header reset dialog offers two destructive actions: **Clear mistakes only** (preserves attempt history) and **Reset everything**. Each first-submit is timed (wall-clock seconds from when the question appears to when the student presses Check answer) and stored in `state.times` (`Record<questionId, number[]>`); section cards surface the per-section average via a clock badge ("avg 38s") and the end-of-session summary shows total run time + average per question. "Try again" / "Skip" never record a second sample for the same question. Reset everything also clears all timings. Production builds register a service worker (`public/sw.js`) for true offline-after-first-load support: app-shell pre-cached on install, navigations are network-first with cache fallback, assets/fonts are cache-first with background refresh. `vite.config.ts` falls back to `PORT=5173` and `BASE_PATH=/` when env vars are absent so plain `vite build`/`vite dev` works outside the Replit managed runtime. Footer text is fixed: "Prepared for internal learning support by Sri Bintang Education."
