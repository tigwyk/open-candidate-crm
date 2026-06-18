"use client";

import { useApp, type Module } from "@/lib/store";
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
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  id: Module;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "voters", label: "Voters", icon: Users },
  { id: "volunteers", label: "Volunteers", icon: HeartHandshake },
  { id: "donors", label: "Donors", icon: DollarSign },
  { id: "canvass", label: "Canvassing", icon: DoorOpen },
  { id: "phonebank", label: "Phone Bank", icon: PhoneCall },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: ListTodo },
];

export function MobileNav() {
  const active = useApp((s) => s.active);
  const setModule = useApp((s) => s.set);
  const setOpen = useApp((s) => s.setSidebar);
  const open = useApp((s) => s.sidebarOpen);

  const handle = (m: Module) => {
    setModule(m);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="p-0 w-72">
        <SheetHeader className="px-5 py-4 border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Vote className="size-4.5" />
            </div>
            <div className="leading-tight text-left">
              <div className="font-semibold text-[14px]">CampaignGround</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Local Election CRM
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="px-3 py-3 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handle(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
