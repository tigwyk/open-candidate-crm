"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type InviteInfo = {
  email: string;
  campaignName: string;
  officeSought: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/invites/token/${token}`);
      if (!r.ok) {
        setLoadError("This invite link is invalid.");
        return;
      }
      const data: InviteInfo = await r.json();
      setInvite(data);
    })();
  }, [token]);

  async function acceptLoggedIn() {
    setSubmitting(true);
    setFormError(null);
    const r = await fetch(`/api/invites/token/${token}/accept`, { method: "POST" });
    setSubmitting(false);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setFormError(body?.error ?? "Failed to accept invite.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function acceptNewAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const r = await fetch(`/api/invites/token/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });

    if (r.status === 409) {
      const body = await r.json().catch(() => ({}));
      if (body?.requiresLogin) {
        setNeedsLogin(true);
        setSubmitting(false);
        return;
      }
    }

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setFormError(body?.error ?? "Failed to accept invite.");
      setSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email: invite?.email,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (result?.error) {
      setFormError("Account created, but automatic sign-in failed. Please log in.");
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (loadError) {
    return (
      <InviteShell title="Invite not found">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Link href="/login" className="text-sm text-primary underline underline-offset-2">
          Go to login
        </Link>
      </InviteShell>
    );
  }

  if (!invite) {
    return (
      <InviteShell title="Loading invite…">
        <p className="text-sm text-muted-foreground">Please wait.</p>
      </InviteShell>
    );
  }

  if (invite.status === "expired") {
    return (
      <InviteShell title="Invite expired">
        <p className="text-sm text-muted-foreground">
          This invite to join {invite.campaignName} has expired. Ask the campaign owner to send a new one.
        </p>
      </InviteShell>
    );
  }

  if (invite.status === "revoked") {
    return (
      <InviteShell title="Invite revoked">
        <p className="text-sm text-muted-foreground">This invite is no longer valid.</p>
      </InviteShell>
    );
  }

  if (invite.status === "accepted") {
    return (
      <InviteShell title="Already accepted">
        <p className="text-sm text-muted-foreground">This invite has already been used.</p>
        <Link href="/login" className="text-sm text-primary underline underline-offset-2">
          Go to login
        </Link>
      </InviteShell>
    );
  }

  if (needsLogin) {
    return (
      <InviteShell title="Log in to accept">
        <p className="text-sm text-muted-foreground">
          An account already exists for {invite.email}. Log in, then reopen this invite link to accept.
        </p>
        <Link
          href={`/login?next=/invite/${token}`}
          className="text-sm text-primary underline underline-offset-2"
        >
          Log in
        </Link>
      </InviteShell>
    );
  }

  if (sessionStatus === "authenticated" && session?.user?.email === invite.email) {
    return (
      <InviteShell
        title={`Join ${invite.campaignName}`}
        description={`You're signed in as ${session.user.email}.`}
      >
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button onClick={acceptLoggedIn} disabled={submitting}>
          {submitting ? "Joining…" : "Accept invite"}
        </Button>
      </InviteShell>
    );
  }

  const signedInAsDifferentUser =
    sessionStatus === "authenticated" && session?.user?.email && session.user.email !== invite.email;

  return (
    <InviteShell
      title={`Join ${invite.campaignName}`}
      description={
        signedInAsDifferentUser
          ? `You're signed in as ${session!.user!.email}, but this invite is for ${invite.email}. Create an account for ${invite.email} below.`
          : `Create your account to accept this invite for ${invite.email}.`
      }
    >
      <form onSubmit={acceptNewAccount} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Joining…" : "Create account and join"}
        </Button>
      </form>
    </InviteShell>
  );
}

function InviteShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </div>
  );
}
