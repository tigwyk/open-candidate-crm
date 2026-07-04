"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsPlatformOwner } from "@/lib/memberships";
import { useToast } from "@/hooks/use-toast";
import { useSavingAction } from "@/lib/use-saving-action";
import { formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PlatformCampaign {
  id: string;
  candidateName: string;
  officeSought: string;
  district: string;
  createdAt: string;
  memberCount: number;
  owner: { name: string; email: string } | null;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  isPlatformOwner: boolean;
  createdAt: string;
  memberships: { campaignName: string; role: string }[];
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function PlatformAdminPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformAdminContent />
    </QueryClientProvider>
  );
}

function PlatformAdminContent() {
  const router = useRouter();
  const isPlatformOwner = useIsPlatformOwner();

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ["platform", "campaigns"],
    queryFn: async (): Promise<{ items: PlatformCampaign[] }> =>
      (await fetch("/api/platform/campaigns")).json(),
    enabled: isPlatformOwner,
  });
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["platform", "users"],
    queryFn: async (): Promise<{ items: PlatformUser[] }> =>
      (await fetch("/api/platform/users")).json(),
    enabled: isPlatformOwner,
  });

  if (!isPlatformOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Not available</CardTitle>
            <CardDescription>This page is only visible to the platform owner.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to app
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campaigns = campaignsData?.items ?? [];
  const users = usersData?.items ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Platform admin</h1>
        <p className="text-sm text-muted-foreground">
          Deployment-wide, read-only view across all campaigns and users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaigns</CardTitle>
          <CardDescription>Every campaign in this deployment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.candidateName}</TableCell>
                    <TableCell>{c.officeSought}</TableCell>
                    <TableCell>{c.district}</TableCell>
                    <TableCell>
                      {c.owner ? `${c.owner.name} (${c.owner.email})` : "—"}
                    </TableCell>
                    <TableCell>{c.memberCount}</TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
          <CardDescription>Every account in this deployment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {u.name}
                      {u.isPlatformOwner && <Badge variant="secondary">Platform owner</Badge>}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.memberships.length === 0
                        ? "—"
                        : u.memberships.map((m) => `${m.campaignName} (${m.role})`).join(", ")}
                    </TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TransferOwnershipCard />
    </div>
  );
}

function TransferOwnershipCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { saving, run } = useSavingAction();
  const [email, setEmail] = useState("");

  async function transfer() {
    if (!email) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    await run(
      () =>
        fetch("/api/platform/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }),
      {
        failTitle: "Failed to transfer platform ownership",
        onSuccess: () => {
          setEmail("");
          toast({ title: "Platform ownership transferred" });
          queryClient.invalidateQueries({ queryKey: ["memberships"] });
          queryClient.invalidateQueries({ queryKey: ["platform"] });
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Transfer platform ownership</CardTitle>
        <CardDescription>
          Hand off deployment-wide access to another existing account. This is irreversible until
          they transfer it back.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="flex-1 max-w-xs">
          <Label className="text-xs">New platform owner&apos;s email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            type="email"
            className="mt-1"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!email || saving}>
              Transfer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Transfer platform ownership?</AlertDialogTitle>
              <AlertDialogDescription>
                {email} will become the platform owner. You will lose access to this page unless
                they transfer it back to you.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={transfer}>Confirm transfer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
