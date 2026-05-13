# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`taskaio` is a WBS-based project scheduling web app (Epic > Story > Task) with an interactive Gantt chart. Multi-DB: PostgreSQL/Supabase or SQLite, selected via the `DB_TYPE` env var.

Stack: Next.js 14 App Router, TypeScript, Drizzle ORM, NextAuth v5 (beta), Tailwind + shadcn/ui, dhtmlx-gantt, Zustand, React Query. Package manager is **pnpm** (required).

## Commands

- `pnpm dev` — start Next dev server
- `pnpm build` — production build
- `pnpm start` — run production build
- `pnpm lint` — `next lint`
- `pnpm test` — run Vitest once
- `pnpm vitest run path/to/file.test.ts` — run a single test file
- `pnpm vitest -t "test name"` — run a single test by name
- `pnpm drizzle-kit push` — apply schema to the DB selected by `DB_TYPE`
- `pnpm drizzle-kit generate` — generate migrations into `drizzle/<dbType>/`

`drizzle.config.ts` reads `DB_TYPE` and `DATABASE_URL` from `.env.local` and switches the schema file (`pg.ts` vs `sqlite.ts`) and output dir accordingly.

## Architecture

**Config-driven first run.** If `DATABASE_URL` is missing, the app redirects to `/setup`. `src/lib/db/setup-check.ts` gates this. In Docker, `/app/data/.env` is persisted and copied to `/app/.env` on container start by `scripts/start.sh`.

**DB layer is a runtime-switched Proxy** (`src/lib/db/index.ts`). It lazily constructs either a postgres-js or better-sqlite3 Drizzle instance based on `DB_TYPE`, caches it on `globalThis` to survive Next HMR, and is exposed as a `Proxy` so imports work before setup is complete. The Drizzle adapter for NextAuth depends on this Proxy returning `undefined` for certain probe properties pre-init — don't change that behavior without checking NextAuth init.

**Three-layer data flow:** `app/actions/*` (Server Actions) → `lib/db/repositories/*` → Drizzle. Server Actions own:
1. `authCheck(projectId)` permission gate (see `lib/auth-checks.ts`)
2. Validation
3. Repository call
4. `revalidatePath(...)` for cache invalidation

Repositories own SQL and reusable business logic; they must stay compatible with **both** PG and SQLite. Schema is defined per-dialect in `src/lib/db/schema/{pg,sqlite}.ts`.

**Conventions baked into the schema:**
- Soft delete via `isDeleted` — filter on reads, don't hard-delete.
- Dates stored as ISO strings in `text` columns for SQLite compatibility; avoid native `timestamp` semantics in shared code.
- Role-based access: Owner / Manager / Member, enforced through `authCheck`.

**Gotcha — SQLite schema file is missing.** `lib/db/index.ts` and `drizzle.config.ts` both branch on `DB_TYPE=sqlite` and expect `src/lib/db/schema/sqlite.ts`, but only `pg.ts` exists today (`schema/index.ts` re-exports `./pg` only). Running with `DB_TYPE=sqlite` or `drizzle-kit` against sqlite will fail until that file is added. Treat PG as the only working dialect for now.

**State.** Server state via React Query; client/global UI state via Zustand stores in `src/store/`.

**Gantt.** `dhtmlx-gantt` integration utilities live in `src/lib/gantt-utils.ts`. Drag/resize handlers should round-trip through Server Actions so DB stays the source of truth.

## Notes for changes

- When adding a column or table, update `schema/pg.ts` (and `schema/sqlite.ts` once it's introduced) and run `drizzle-kit push` with the matching `DB_TYPE`.
- New mutations belong in `app/actions/`, not in route handlers or client components.
- Never bypass `authCheck` in Server Actions that touch project-scoped data.
