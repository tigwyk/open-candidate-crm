# CampaignGround

[![CI](https://github.com/tigwyk/open-candidate-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/tigwyk/open-candidate-crm/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A voter, volunteer, donor, and outreach CRM built specifically for campaigns running for local office — city council, school board, mayor. Multi-campaign, multi-user, and free of the bloat of a generic sales CRM.

## Screenshots

| Dashboard | Voters | Canvassing |
|---|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Voter detail](docs/screenshots/voter-detail.png) | ![Canvassing](docs/screenshots/canvass.png) |

| Phone Bank | Donors | Tasks |
|---|---|---|
| ![Phone Bank](docs/screenshots/phonebank.png) | ![Donors](docs/screenshots/donors.png) | ![Tasks](docs/screenshots/tasks.png) |

More in [`docs/screenshots/`](docs/screenshots/), including mobile views.

## Features

- **8 core modules** — Dashboard, Voters, Volunteers, Donors, Canvassing, Phone Banking, Events, Tasks
- **Multi-campaign, multi-user** — one deployment can host several campaigns, each with its own `owner`/`member` roles
- **Duplicate-contact prevention** — a claim/lock system stops two volunteers from knocking the same door or calling the same voter at once
- **Self-service signup** — anyone can create an account and a fresh campaign at `/signup`
- **Team invites** — campaign owners invite teammates by email (Postmark), with bounce detection and automatic re-activation on resend
- **Production-hardened API** — every mutating route is zod-validated and rate-limited, not just auth-gated

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Auth | next-auth v4 (Credentials provider, JWT sessions) |
| Database | PostgreSQL via Prisma |
| Styling | Tailwind CSS 4 + shadcn/ui + Radix primitives |
| Data fetching | TanStack React Query |
| Email | Postmark (transactional + bounce webhooks) |
| Package manager | [Bun](https://bun.sh) |
| Deployment | Docker, deployed on [Railway](https://railway.app) |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full domain model, auth model, and module map.

## Quickstart

Prerequisites: [Bun](https://bun.sh), [Docker](https://docker.com) (for local Postgres).

```bash
git clone https://github.com/tigwyk/open-candidate-crm.git
cd open-candidate-crm
cp .env.example .env

docker compose up -d          # starts local Postgres, matches .env.example out of the box
bun install
bunx prisma migrate deploy    # applies all migrations

bun run dev                   # http://localhost:3000
```

From there, either:
- Visit `/signup` to create your own account and a blank campaign, or
- Hit `GET /api/seed` once to bootstrap a demo admin account and a fully-populated demo campaign (280 voters, volunteers, donors, events — good for exploring the UI without data entry).

## Environment variables

Full reference lives in [`.env.example`](.env.example). Grouped by concern:

- **Database** — `DATABASE_URL` (Postgres connection string)
- **Auth** — `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, plus a legacy `ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` fallback only consulted during the very first `GET /api/seed` bootstrap
- **Signup** — `MAX_USERS` (optional cap on total accounts; unset = unlimited)
- **Email (Postmark)** — `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`, `POSTMARK_WEBHOOK_USERNAME`/`POSTMARK_WEBHOOK_PASSWORD` (Basic Auth for the bounce webhook). Without `POSTMARK_SERVER_TOKEN` set, invite emails are logged to the console instead of sent — handy for local dev.

## Deploying to Railway

CampaignGround ships as a standalone Docker image (`Dockerfile`) that runs `prisma migrate deploy` before the server starts, so schema migrations apply automatically on every deploy — nothing manual to run against production. `railway.json` is already configured to build from that Dockerfile. This whole flow takes about 10 minutes and has been run end-to-end against a real Railway deployment.

### 1. Create the project

- **Dashboard**: [railway.app/new](https://railway.app/new) → **Deploy from GitHub repo** → pick your fork of this repo. Railway will detect the `Dockerfile` and `railway.json` automatically.
- **CLI** (alternative): `railway login`, then from a clone of this repo, `railway init` to create a new project, or `railway link` to attach to one you already made in the dashboard.

### 2. Add Postgres

In the project, click **New** → **Database** → **Add PostgreSQL**. This provisions a managed Postgres instance in the same project.

### 3. Link the database to the app service

On the app service (not the Postgres service), go to **Variables** → **New Variable** → **Add Reference** → select the Postgres service's `DATABASE_URL`. This wires the app to the database without ever typing the connection string by hand, and it stays correct if Railway ever rotates credentials.

### 4. Generate a public domain — and get the port binding right

Under the app service's **Settings** → **Networking** → **Generate Domain**. Note the port it picks (Railway defaults new domains to port 3000; if you ever change this, make sure it matches what the app actually listens on).

Then set these two variables on the app service (**Variables** tab) — **skipping either one will produce a "Application failed to respond" 502**, even though the deploy itself shows as successful:

| Variable | Value | Why |
|---|---|---|
| `PORT` | `3000` | Must match the port your generated domain targets. Railway injects its own default (often `8080`) if you don't set this explicitly, which won't match the domain. |
| `HOSTNAME` | `0.0.0.0` | The Next.js standalone server needs to bind to all interfaces, not just localhost, or Railway's edge proxy can't reach the container even though the app is running fine. |

### 5. Set the remaining required variables

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | A fresh random secret — `openssl rand -base64 32`. Don't reuse a value from local `.env`. |
| `NEXTAUTH_URL` | The exact domain from step 4, e.g. `https://your-app.up.railway.app` (include `https://`). |
| `NODE_ENV` | `production` |

Everything else in [`.env.example`](.env.example) is optional at this point (email, signup caps) — see the Environment variables section above. You can add those later without redeploying anything else.

### 6. Deploy

- **Dashboard**: pushing to your connected branch triggers a deploy automatically. Or click **Deploy** manually from the service view.
- **CLI**: `railway up` from the repo root.

Watch the build in the dashboard's **Deployments** tab, or `railway logs --build`. A successful deploy log ends with the Prisma migrations applying (`All migrations have been successfully applied.`) followed by `✓ Ready`.

### 7. Bootstrap your first login

Once it's live, hit `GET https://your-app.up.railway.app/api/seed` once (in a browser or with `curl`). This is the *only* unauthenticated route in the whole app, and it only ever fires on a genuinely empty database — it creates one admin account and a fully-populated demo campaign, and returns a one-time generated password in the JSON response:

```json
{"ok":true,"seeded":true,"campaignId":"...","loginEmail":"admin@example.com","generatedPassword":"..."}
```

Copy that password immediately — it's shown exactly once. Log in with it at `/login`, or just send yourself an invite to `/signup` instead if you'd rather start with a blank campaign under your own email.

### 8. (Optional) Turn on real email for invites

Team invites work without this — they just log the invite link to the deploy logs instead of emailing it, which is fine for testing. To send real email:

1. Create a server in [Postmark](https://postmarkapp.com) and set it to **Live**, not **Sandbox**, when you create it. **Postmark servers cannot be converted between Sandbox and Live after creation** — if you accidentally pick Sandbox, you'll need to create a second server, there's no toggle to fix it later.
2. Verify a sending domain or sender signature in Postmark, and set `EMAIL_FROM` to an address on it.
3. Set `POSTMARK_SERVER_TOKEN` (from that server's API Tokens tab) on the Railway app service.
4. Generate two random values for `POSTMARK_WEBHOOK_USERNAME` / `POSTMARK_WEBHOOK_PASSWORD` and set them as Railway variables too.
5. In Postmark, on the same server: **Webhooks** → **Add webhook** → trigger **Bounce** → URL `https://<POSTMARK_WEBHOOK_USERNAME>:<POSTMARK_WEBHOOK_PASSWORD>@your-app.up.railway.app/api/webhooks/postmark/bounce` (the credentials go directly in the URL as Basic Auth).

### Troubleshooting

- **502 "Application failed to respond"** — almost always `PORT`/`HOSTNAME` (step 4). Check the deploy logs for what port the server actually bound to and compare against the domain's target port.
- **Invite emails never arrive, but the API call succeeds** — check whether the Postmark server is in Sandbox mode (`GET /server` on Postmark's API, or the server's dashboard page shows it plainly). Sandbox sends report success but never deliver anything.
- **Migrations fail on deploy** — check `railway logs` for the Prisma output specifically; the container won't start serving traffic until migrations succeed, so a stuck deploy is usually a migration issue, not an app issue.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](LICENSE)
