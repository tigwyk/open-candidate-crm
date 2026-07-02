import { TEST_BASE_URL } from "../setup";

export function uniqueEmail(prefix = "test"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}@example.com`;
}

// POST /api/signup is rate-limited per IP (see src/app/api/signup/route.ts).
// Every signup in the test suite fakes a distinct X-Forwarded-For so
// independent tests/files don't trip each other's rate-limit bucket.
function uniqueTestIp(): string {
  const octet = () => Math.floor(Math.random() * 255);
  return `10.${octet()}.${octet()}.${octet()}`;
}

// Minimal cookie jar: absorbs Set-Cookie headers across a sequence of
// requests (CSRF fetch, then the credentials callback) into one Cookie
// header value, mirroring the `-b`/`-c` curl flow used throughout manual
// verification of this app. Every request below passes `credentials: "omit"`
// deliberately — Bun's fetch has its own automatic cross-request cookie jar
// per origin, which would otherwise silently reuse cookies from a previous
// test's session instead of whatever this jar explicitly sends.
class CookieJar {
  private cookies = new Map<string, string>();

  absorb(res: Response) {
    for (const setCookie of res.headers.getSetCookie()) {
      const [pair] = setCookie.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
    }
  }

  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

export async function fetchAs(cookie: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${TEST_BASE_URL}${path}`, {
    ...init,
    credentials: "omit",
    headers: { ...(init?.headers ?? {}), Cookie: cookie },
  });
}

// Performs the real NextAuth credentials login flow (CSRF token, then the
// callback), returning a Cookie header value usable in subsequent requests.
export async function login(email: string, password: string): Promise<string> {
  const jar = new CookieJar();

  const csrfRes = await fetch(`${TEST_BASE_URL}/api/auth/csrf`, { credentials: "omit" });
  jar.absorb(csrfRes);
  const { csrfToken } = await csrfRes.json();

  const loginRes = await fetch(`${TEST_BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar.header() },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }),
  });
  jar.absorb(loginRes);

  return jar.header();
}

export interface TestAccount {
  email: string;
  password: string;
  name: string;
  campaignId: string;
  cookie: string;
}

// Creates a brand-new user + blank campaign via the real /api/signup route,
// logs in for real, and resolves the resulting campaignId — the same path a
// real user takes, not a direct DB insert.
export async function signupAndLogin(
  overrides?: Partial<{
    name: string;
    email: string;
    password: string;
    candidateName: string;
    officeSought: string;
    district: string;
    electionDate: string;
  }>
): Promise<TestAccount> {
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? "correcthorsebatterystaple1";
  const name = overrides?.name ?? "Test Owner";

  const signupRes = await fetch(`${TEST_BASE_URL}/api/signup`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": uniqueTestIp() },
    body: JSON.stringify({
      name,
      email,
      password,
      candidateName: overrides?.candidateName ?? "Test Candidate",
      officeSought: overrides?.officeSought ?? "City Council",
      district: overrides?.district ?? "District 1",
      electionDate: overrides?.electionDate ?? "2026-11-03",
    }),
  });
  if (!signupRes.ok) {
    throw new Error(`Signup failed: ${signupRes.status} ${await signupRes.text()}`);
  }

  const cookie = await login(email, password);

  const membershipsRes = await fetchAs(cookie, "/api/memberships");
  const memberships = await membershipsRes.json();
  const campaignId = memberships.items?.[0]?.campaignId;
  if (!campaignId) throw new Error("Signup succeeded but no campaign membership was found");

  return { email, password, name, campaignId, cookie };
}

// Seeds an *additional* demo-populated campaign (280 voters, donors,
// volunteers, etc.) for an already-logged-in test account, via the real
// authenticated POST /api/seed route — needed for tests that require real
// records to operate on (IDOR targets, list/filter tests).
export async function seedDemoCampaign(cookie: string): Promise<string> {
  const res = await fetchAs(cookie, "/api/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Demo seed failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return body.campaignId as string;
}
