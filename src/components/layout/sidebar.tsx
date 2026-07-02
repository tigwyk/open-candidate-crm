"use client";

import { useApp, type Module } from "@/lib/store";
import { useCurrentRole } from "@/lib/memberships";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  DollarSign,
  DoorOpen,
  PhoneCall,
  CalendarDays,
  ListTodo,
  Vote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  id: Module;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  ownerOnly?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Live metrics" },
    ],
  },
  {
    section: "People",
    items: [
      { id: "voters", label: "Voters", icon: Users, hint: "Database" },
      { id: "volunteers", label: "Volunteers", icon: HeartHandshake },
      { id: "donors", label: "Donors", icon: DollarSign, ownerOnly: true },
    ],
  },
  {
    section: "Outreach",
    items: [
      { id: "canvass", label: "Canvassing", icon: DoorOpen, hint: "Door knocks" },
      { id: "phonebank", label: "Phone Bank", icon: PhoneCall },
    ],
  },
  {
    section: "Plan",
    items: [
      { id: "events", label: "Events", icon: CalendarDays },
      { id: "tasks", label: "Tasks", icon: ListTodo },
    ],
  },
];

export function Sidebar() {
  const active = useApp((s) => s.active);
  const setModule = useApp((s) => s.set);
  const role = useCurrentRole();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shadow-sm">
          <Vote className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-[15px] text-sidebar-foreground">
            CampaignGround
          </div>
          <div className="text-[11px] text-muted-foreground tracking-wide uppercase">
            Local Election CRM
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scroll-area-thin">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <div className="px-2 mb-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {group.section}
            </div>
            <ul className="space-y-0.5">
              {group.items.filter((item) => !item.ownerOnly || role === "owner").map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setModule(item.id)}
                      className={cn(
                        "w-full group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className={cn("size-4", isActive ? "" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.hint && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border",
                          isActive
                            ? "border-sidebar-primary-foreground/30 text-sidebar-primary-foreground/80"
                            : "border-border text-muted-foreground"
                        )}>
                          {item.hint}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Election in 47 days</span>
          <Badge variant="outline" className="font-mono text-[10px] py-0 h-4">
            v1.0
          </Badge>
        </div>
      </div>
    </aside>
  );
}
