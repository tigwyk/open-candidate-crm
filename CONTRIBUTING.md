# Contributing

## Local setup

See the [README quickstart](README.md#quickstart) — `docker compose up -d`, `bun install`, `bunx prisma migrate deploy`, `bun run dev`.

## Workflow

1. Branch off `main`.
2. Make your change.
3. Open a PR against `main`. CI (`.github/workflows/ci.yml`) runs lint, a Postgres-backed migration check, and a production build on every push — it needs to be green before merge.

## Code style

- `bun run lint` (ESLint, flat config in `eslint.config.mjs`) — no separate formatter is enforced beyond that.
- TypeScript strict mode is on (`tsconfig.json`); don't add `any` escapes without a good reason.
- Follow existing patterns rather than introducing new ones for the same problem — e.g. new API routes should validate bodies via `src/lib/api-validate.ts` + `src/lib/validation/*.ts` the same way every existing route does, and new client-side forms should follow the plain-`useState` + `useToast` pattern already used throughout (this codebase does not use React Hook Form for its own forms, despite it being a dependency).

## Tests

There isn't a test suite yet. If you're adding one, open an issue first to discuss the approach (framework choice, what to cover) before sinking time into it.

## Database changes

- Always generate a real migration: `bunx prisma migrate dev --name <short-description>`. Never hand-edit the generated SQL, and never commit a schema change that was only applied via `prisma db push` (that's fine for local iteration, but it leaves no migration file for anyone else — or CI — to apply).
- Migrations are applied automatically on deploy (`prisma migrate deploy` runs as part of the Docker container's start command), so a missing migration file means production silently drifts from `schema.prisma`.

## Where to ask questions

Open a GitHub issue — use the bug report or feature request template under `.github/ISSUE_TEMPLATE/`.
