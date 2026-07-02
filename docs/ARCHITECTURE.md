# Architecture

## Tech stack

Next.js 16 (App Router), React 19, TypeScript (strict), Prisma 6 + PostgreSQL, next-auth v4 (Credentials provider, JWT sessions), Tailwind CSS 4 + shadcn/ui + Radix, TanStack React Query, Zustand (UI state only), Postmark (transactional email), Bun (package manager + runtime).

## Routing model

There is **no Next.js file-based routing per module**. `src/app/page.tsx` renders a single-page shell that swaps between 8 views based on a Zustand store (`useApp().active`) — it behaves like a classic SPA even though it's built on the App Router. Real routes exist only for pre-auth pages (`/login`, `/signup`, `/invite/[token]`) and API handlers under `src/app/api/`.

## Domain model

```
User ── CampaignMembership (role: owner | member) ── Campaign
                                                        ├─ Precinct ── Household ── Voter ── Donor (0/1)
                                                        ├─ Volunteer
                                                        ├─ Donation (Donor × Voter)      [owner-only]
                                                        ├─ Event ── EventAttendee (Voter | Volunteer)
                                                        ├─ Task (assignable to Volunteer or Voter)
                                                        ├─ CanvassLog (door-knock outcome)
                                                        ├─ CallLog (phone outcome)
                                                        ├─ ContactClaim (in-progress lock: call/canvass, 5-min TTL)
                                                        └─ Invite (team-member invite, pending/accepted/revoked/expired/bounced)
```

Every campaign-scoped model carries a `campaignId`; nothing is queried without going through the access layer below.

## Auth & access

- Login is email/password (bcrypt) via next-auth's Credentials provider; sessions are JWTs carrying `user.id`.
- `src/proxy.ts` (Next 16's middleware convention) gates the whole app except `/login`, `/signup`, `/invite/[token]`, `/api/auth`, `/api/seed`, `/api/signup`, and `/api/invites/token/*` (the public accept-invite flow).
- Every API route resolves access via `requireUser()` / `requireCampaignAccess(campaignId, opts?)` in `src/lib/api-auth.ts`. `requireCampaignAccess` returns `{userId, campaignId, role}` or a `{error: NextResponse}` (400 no campaignId, 401 no session, 403 no membership/wrong role) — every route follows the same `if ("error" in access) return access.error;` pattern.
- Two roles per campaign: `owner` (full access, including donors/donations) and `member` (everything else).
- Both `requireUser` and `requireCampaignAccess` apply an in-memory sliding-window rate limit (`src/lib/rate-limit.ts`) — by IP pre-auth, by user ID post-auth. **This only works correctly on a single server instance** — `railway.json` pins the deploy to one replica for this reason.

## Onboarding

- **Self-service signup** (`POST /api/signup`, `src/app/signup/page.tsx`): open to anyone, rate-limited, optional `MAX_USERS` cap. Creates a `User`, a **blank** `Campaign` (no demo data), and an `owner` `CampaignMembership` in one transaction.
- **First-run bootstrap** (`GET /api/seed`): fires only when zero `User` rows exist. Seeds a fully-populated demo campaign (280 voters, volunteers, donors, events, canvass/call logs) plus one admin user — this is how a fresh deployment gets its first login.
- **Team invites** (`POST /api/invites`, accepted via `/invite/[token]`): a campaign `owner` invites a teammate by email. Sends through Postmark (`src/lib/email.ts`); without `POSTMARK_SERVER_TOKEN` configured, the invite link is logged to the console instead (dev convenience). Accepting works whether the invitee already has an account (just adds a `CampaignMembership`) or not (creates the `User` too). Bounces are tracked via a Postmark webhook (`POST /api/webhooks/postmark/bounce`, Basic Auth) and automatically un-suppressed on resend via `reactivateBounce()`.

## API conventions

- Route handlers live under `src/app/api/**/route.ts`. List endpoints return `{items, total?, offset?, limit?}`; single-object GET/POST/PATCH return the raw object; errors return `{error: string}`.
- Server-side validation lives in `src/lib/validation/*.ts` (one file per domain), consumed via `parseBody`/`parseQuery` helpers in `src/lib/api-validate.ts` — every mutating route validates its body before touching the database.
- PATCH/DELETE-by-id routes look up the record first to get its real `campaignId`, then check access against *that* — a client-supplied `campaignId` is never trusted for an existing record.

## Module map (frontend)

| Module | File | Access |
|---|---|---|
| Dashboard | `src/components/dashboard/dashboard-view.tsx` | owner + member (donor data stripped for member) |
| Voters | `src/components/voters/voters-view.tsx` | owner + member |
| Volunteers | `src/components/volunteers/volunteers-view.tsx` | owner + member |
| Donors | `src/components/donors/donors-view.tsx` | owner only |
| Canvassing | `src/components/canvass/canvass-view.tsx` | owner + member (claim-based walk list) |
| Phone Banking | `src/components/phonebank/phonebank-view.tsx` | owner + member (claim-based call queue) |
| Events | `src/components/events/events-view.tsx` | owner + member |
| Tasks | `src/components/tasks/tasks-view.tsx` | owner + member |

## Deployment

`Dockerfile` builds with `bun install --frozen-lockfile`, runs `prisma generate` + `bun run build`, and its `CMD` runs `prisma migrate deploy` before starting the server — every deploy applies pending migrations automatically. `railway.json` sets `numReplicas: 1` (required by the in-memory rate limiter, see above) and points at the Dockerfile build.

## Known limitations

- No test suite yet.
- Rate limiting is in-memory and per-instance — a real horizontal-scaling story would need a shared store (Redis) instead.
- `Voter.tags` / `CanvassLog.issuePriority` are comma-separated strings, not a normalized relation — fine at current scale, would need revisiting if real tag-based search/filtering becomes a requirement.
