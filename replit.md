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

## GitHub Repository

- **URL**: https://github.com/sribintangDev/igcse-add-maths-crash
- **Remote**: `origin` → `https://github.com/sribintangDev/igcse-add-maths-crash.git`
- The main branch is pushed and up to date on GitHub.
- To push future changes: `git push origin main`

## Artifacts

- `artifacts/api-server` — Express API server (default scaffold).
- `artifacts/mockup-sandbox` — design-time component preview.
- `artifacts/practice` — **IGCSE Add Maths Crash Practice**: single-student browser-only self-marking practice app. React + Vite + TypeScript + KaTeX + Tailwind v4 + shadcn/ui. No backend/auth — progress in `localStorage` key `igcse-add-maths-practice/v1`. **7-topic curriculum** (Algebra, Surds, Quadratics, Differentiation, Integration, Trigonometry + Mixed utility). Home shows `TopicCard` grid; each topic → `TopicHome` (Basic/Intermediate/Advanced level selector with progression lock) → `McqPractice` (smart retry MCQ engine: wrong→reshuffle, Q1 correct→Q2 same variantGroup, Q2+ correct→Confident/Try Another decision). Try-number stored in `state.mcqTryNumber`; group completion in `state.variantGroupComplete`. Question bank: `src/data/questions.ts` (75 questions: 64 structured short-text + 11 MCQ, 9 with `variantGroup`/`level` tags for topic MCQ flow). Types: `Topic` | `TopicId` | `Level` (Basic/Intermediate/Advanced). Routes: `/`, `/practice/:section`, `/topic/:topicId`, `/topic/:topicId/:level/mcq`. Grading: `src/lib/grade.ts`. Storage: `src/lib/storage.ts`. Helpers: `variantGroupsForTopicLevel`, `questionsForVariantGroup`, `groupCountsForTopic`. Service worker `public/sw.js` for offline support. `vite.config.ts` falls back to `PORT=5173`/`BASE_PATH=/` when env vars absent.
