"use client";

import { useState, useSyncExternalStore } from "react";
import { useApp } from "@/lib/store";
import { Search, Bell, Plus, Menu, LogOut, Sun, Moon, ChevronsUpDown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "./mobile-nav";
import { useApp as useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useCurrentRole, useMemberships } from "@/lib/memberships";
import { useInvites } from "@/lib/invites";
import { useToast } from "@/hooks/use-toast";
import { useSavingAction } from "@/lib/use-saving-action";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Reports true only after hydration, without calling setState in an effect —
// avoids a hydration mismatch between the server render and the client's
// resolved theme icon.
function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Live campaign metrics & recent activity" },
  voters: { title: "Voters", subtitle: "Registered voter database with support tracking" },
  volunteers: { title: "Volunteers", subtitle: "Canvassers, phone-bankers, and team leads" },
  donors: { title: "Donors", subtitle: "Contributions, compliance, and fundraising goals" },
  canvass: { title: "Canvassing", subtitle: "Door-knock walk lists and contact outcomes" },
  phonebank: { title: "Phone Bank", subtitle: "Call queue, scripts, and outcome tracking" },
  events: { title: "Events", subtitle: "Town halls, knock-kickoffs, and rallies" },
  tasks: { title: "Tasks", subtitle: "Coordinator workflow and team assignments" },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar() {
  const active = useApp((s) => s.active);
  const setSidebar = useAppStore((s) => s.setSidebar);
  const meta = TITLES[active] ?? { title: "CampaignGround", subtitle: "" };

  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHasMounted();

  const { data: session } = useSession();
  const { data: membershipsData } = useMemberships();
  const memberships = membershipsData?.items ?? [];
  const currentCampaignId = useApp((s) => s.currentCampaignId);
  const setCampaign = useApp((s) => s.setCampaign);
  const currentMembership = memberships.find((m) => m.campaignId === currentCampaignId);
  const currentRole = useCurrentRole();
  const [inviteOpen, setInviteOpen] = useState(false);

  const displayName = session?.user?.name ?? session?.user?.email ?? "—";

  return (
    <header className="h-16 border-b bg-card/60 backdrop-blur-sm flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setSidebar(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <h1 className="text-[17px] font-semibold leading-tight truncate">{meta.title}</h1>
        <p className="text-xs text-muted-foreground truncate hidden sm:block">{meta.subtitle}</p>
      </div>

      <div className="hidden lg:flex items-center gap-2 max-w-md flex-1">
        <div className="relative w-full">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search voters, donors, addresses…"
            className="pl-9 h-9 bg-background/60"
          />
        </div>
      </div>

      <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
        <Bell className="size-4" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
      </Button>

      {memberships.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs max-w-[160px]">
              <span className="truncate">{currentMembership?.campaignName ?? "Select campaign"}</span>
              <ChevronsUpDown className="size-3.5 ml-1 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {memberships.map((m) => (
              <DropdownMenuItem key={m.campaignId} onClick={() => setCampaign(m.campaignId)}>
                <div className="flex flex-col">
                  <span className="text-sm">{m.campaignName}</span>
                  <span className="text-[10px] text-muted-foreground">{m.officeSought}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {currentRole === "owner" && currentCampaignId && (
        <InviteTeammateDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          campaignId={currentCampaignId}
        />
      )}

      <div className="hidden sm:flex items-center gap-2 pl-2 border-l">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="leading-tight hidden md:block">
          <div className="text-xs font-medium truncate max-w-[140px]">{displayName}</div>
          <div className="text-[10px] text-muted-foreground capitalize">{currentMembership?.role ?? "—"}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}

function InviteTeammateDialog({
  open,
  onOpenChange,
  campaignId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaignId: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: invitesData } = useInvites(campaignId);
  const invites = invitesData?.items ?? [];
  const [email, setEmail] = useState("");
  const { saving, run } = useSavingAction();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function refetchInvites() {
    queryClient.invalidateQueries({ queryKey: ["invites", campaignId] });
  }

  async function save() {
    if (!email) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    await run(
      () => fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, email }),
      }),
      {
        onSuccess: () => {
          setEmail("");
          toast({ title: "Invite sent" });
          refetchInvites();
        },
        onError: async (r) => {
          const body = await r.json().catch(() => ({}));
          toast({ title: body?.error ?? "Failed to send invite", variant: "destructive" });
        },
      }
    );
  }

  async function revoke(id: string) {
    setRevokingId(id);
    const r = await fetch(`/api/invites/${id}`, { method: "DELETE" });
    setRevokingId(null);
    if (r.ok) {
      refetchInvites();
    } else {
      toast({ title: "Failed to revoke invite", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Invite teammate">
          <UserPlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They'll get an email with a link to join this campaign as a member.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              type="email"
              className="mt-1"
            />
          </div>
        </div>
        {invites.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Pending invites</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate flex-1">{inv.email}</span>
                  <Badge variant={inv.status === "bounced" ? "destructive" : "outline"}>
                    {inv.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={revokingId === inv.id}
                    onClick={() => revoke(inv.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
