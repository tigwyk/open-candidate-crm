# Contributing

## Local setup

See the [README quickstart](README.md#quickstart) — `docker compose up -d`, `bun install`, `bunx prisma migrate deploy`, `bun run dev`.

## Workflow

1. Branch off `main`.
2. Make your change.
3. Open a PR against `main`. CI (`.github/workflows/ci.yml`) runs lint, a Postgres-backed migration check, a production build, and the test suite on every push — it needs to be green before merge.

## Code style

- `bun run lint` (ESLint, flat config in `eslint.config.mjs`) — no separate formatter is enforced beyond that.
- TypeScript strict mode is on (`tsconfig.json`); don't add `any` escapes without a good reason.
- Follow existing patterns rather than introducing new ones for the same problem — e.g. new API routes should validate bodies via `src/lib/api-validate.ts` + `src/lib/validation/*.ts` the same way every existing route does, and new client-side forms should follow the plain-`useState` + `useToast` pattern already used throughout (this codebase does not use React Hook Form for its own forms, despite it being a dependency).

## Tests

Run `bun run build && bun test`. Tests are real HTTP integration tests against the actual standalone build plus a dedicated `<database>_test` Postgres database (created and migrated automatically) — not mocked route handlers — so a production build has to exist first. `tests/unit/` covers pure functions (validation schemas, `rate-limit.ts`); `tests/integration/` drives real signup/login/invite flows and CRUD operations through the live server, matching how this app has always been manually verified (curl against a running instance).

If you add a new mutating API route that accepts a foreign-key id (a `donorId`, `voterId`, `volunteerId`, etc.), add an IDOR regression test alongside it — reference an id from a different campaign and assert the route rejects it (see `tests/integration/security.test.ts` for the existing pattern). This mirrors real bugs this project has shipped and caught.

## Database changes

- Always generate a real migration: `bunx prisma migrate dev --name <short-description>`. Never hand-edit the generated SQL, and never commit a schema change that was only applied via `prisma db push` (that's fine for local iteration, but it leaves no migration file for anyone else — or CI — to apply).
- Migrations are applied automatically on deploy (`prisma migrate deploy` runs as part of the Docker container's start command), so a missing migration file means production silently drifts from `schema.prisma`.

## Where to ask questions

Open a GitHub issue — use the bug report or feature request template under `.github/ISSUE_TEMPLATE/`.
