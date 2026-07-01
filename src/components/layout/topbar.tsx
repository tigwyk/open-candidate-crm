"use client";

import { useApp } from "@/lib/store";
import { Search, Bell, Plus, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "./mobile-nav";
import { useApp as useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { signOut } from "next-auth/react";

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

export function Topbar() {
  const active = useApp((s) => s.active);
  const setSidebar = useAppStore((s) => s.setSidebar);
  const meta = TITLES[active] ?? { title: "CampaignGround", subtitle: "" };

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

      <div className="hidden sm:flex items-center gap-2 pl-2 border-l">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            MR
          </AvatarFallback>
        </Avatar>
        <div className="leading-tight hidden md:block">
          <div className="text-xs font-medium">Maya Reyes</div>
          <div className="text-[10px] text-muted-foreground">Field Director</div>
        </div>
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
