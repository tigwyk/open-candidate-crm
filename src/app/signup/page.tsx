"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [officeSought, setOfficeSought] = useState("");
  const [district, setDistrict] = useState("");
  const [party, setParty] = useState("");
  const [electionDate, setElectionDate] = useState("");
  const [voteGoal, setVoteGoal] = useState("");
  const [fundraisingGoal, setFundraisingGoal] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const r = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        candidateName,
        officeSought,
        district,
        party: party || undefined,
        electionDate,
        voteGoal: voteGoal ? parseInt(voteGoal, 10) : undefined,
        fundraisingGoalCents: fundraisingGoal
          ? Math.round(parseFloat(fundraisingGoal) * 100)
          : undefined,
      }),
    });

    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setError(body?.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Account created, but automatic sign-in failed. Please log in.");
      router.push("/login");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Start your campaign</CardTitle>
          <CardDescription>Create your account and a campaign on CampaignGround.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4 flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground">Campaign details</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidateName">Candidate name</Label>
                <Input
                  id="candidateName"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="officeSought">Office sought</Label>
                  <Input
                    id="officeSought"
                    value={officeSought}
                    onChange={(e) => setOfficeSought(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="party">Party (optional)</Label>
                  <Input id="party" value={party} onChange={(e) => setParty(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="electionDate">Election date</Label>
                  <Input
                    id="electionDate"
                    type="date"
                    value={electionDate}
                    onChange={(e) => setElectionDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="voteGoal">Vote goal (optional)</Label>
                  <Input
                    id="voteGoal"
                    type="number"
                    value={voteGoal}
                    onChange={(e) => setVoteGoal(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fundraisingGoal">Fundraising goal, USD (optional)</Label>
                  <Input
                    id="fundraisingGoal"
                    type="number"
                    value={fundraisingGoal}
                    onChange={(e) => setFundraisingGoal(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating your campaign..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline underline-offset-2">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
